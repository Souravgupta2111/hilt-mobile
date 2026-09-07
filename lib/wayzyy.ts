import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createEngine,
  setPlatformAdapter,
  checkRuntimeCompatibility,
  ModAction,
  TrustTier,
  BookingStage,
  type ActorContext,
  type TrainingSample,
  type TrainingStoreAdapter,
  type Verdict,
  type ModerationEngine,
} from '@wayzyy/moderation-engine';

// Expo has no filesystem / process.env on device.
setPlatformAdapter({
  readTextFile: () => null,
  env: () => null,
});

const TRAINING_KEY = '@wayzyy/training-samples';
let trainingCache: TrainingSample[] = [];

const trainingAdapter: TrainingStoreAdapter = {
  load: () => trainingCache,
  append: (sample: TrainingSample) => {
    trainingCache.push(sample);
    AsyncStorage.setItem(TRAINING_KEY, JSON.stringify(trainingCache)).catch(() => {});
  },
  clear: () => {
    trainingCache = [];
    AsyncStorage.removeItem(TRAINING_KEY).catch(() => {});
  },
};

export async function hydrateWayzyyStore() {
  try {
    const raw = await AsyncStorage.getItem(TRAINING_KEY);
    if (raw) trainingCache = JSON.parse(raw);
  } catch {
    trainingCache = [];
  }
}

let engine: ModerationEngine | null = null;

export function getWayzyyEngine(): ModerationEngine {
  if (engine) return engine;
  const compat = checkRuntimeCompatibility();
  if (!compat.ok) {
    console.warn('[Wayzyy] Runtime issues:', compat.failures);
  }
  // Deterministic Tiers 0-2 on device. Tier-3 judge stays off unless a key is
  // provided, so chat moderation never depends on the network.
  const groqKey = process.env.EXPO_PUBLIC_WAYZYY_GROQ_KEY;
  engine = createEngine({
    ...(groqKey ? { provider: { apiKey: groqKey } } : {}),
    trainingAdapter,
    abuseRouter: null,
    cache: { capacity: 1024, ttlMs: 30 * 60 * 1000 },
  });
  return engine;
}

export type ChatStage = 'inquiry' | 'booked' | 'checkedIn';

function toBookingStage(stage: ChatStage): BookingStage {
  if (stage === 'booked') return BookingStage.Booked;
  if (stage === 'checkedIn') return BookingStage.CheckedIn;
  return BookingStage.Inquiry;
}

export interface ModerationOutcome {
  action: ModAction;
  allowed: boolean;
  /** Text safe to store/send (masked when action is Mask). */
  sendText: string;
  reasonCodes: string[];
  score: number;
  verdict: Verdict;
}

/**
 * Runs the real Wayzyy engine over an outgoing chat message.
 * Never throws — on unexpected failure it fails closed to review.
 */
export async function moderateChatMessage(
  text: string,
  opts: {
    conversationId: string;
    senderId: string;
    stage?: ChatStage;
    trust?: TrustTier;
    priorViolations?: number;
  }
): Promise<ModerationOutcome> {
  const eng = getWayzyyEngine();
  const actor: ActorContext = {
    trust: opts.trust ?? TrustTier.Standard,
    stage: toBookingStage(opts.stage ?? 'inquiry'),
    priorViolations: opts.priorViolations ?? 0,
    conversationID: opts.conversationId,
    senderID: opts.senderId,
  };
  try {
    const verdict = await eng.evaluateAsync(text, actor);
    eng.remember(text, actor);
    const withholds =
      verdict.action === ModAction.Block ||
      verdict.action === ModAction.Review ||
      verdict.action === ModAction.Warn;
    return {
      action: verdict.action,
      allowed: !withholds,
      sendText: verdict.action === ModAction.Mask ? verdict.maskedText : text,
      reasonCodes: verdict.reasonCodes ?? [],
      score: verdict.score,
      verdict,
    };
  } catch (err) {
    console.warn('[Wayzyy] moderation failed closed:', err);
    return {
      action: ModAction.Review,
      allowed: false,
      sendText: text,
      reasonCodes: ['ENGINE_ERROR'],
      score: 1,
      verdict: undefined as unknown as Verdict,
    };
  }
}

export function recordWayzyyBlock(senderId: string) {
  try {
    getWayzyyEngine().recordBlock(senderId);
  } catch {
    // non-fatal
  }
}

export { ModAction, TrustTier, BookingStage };
