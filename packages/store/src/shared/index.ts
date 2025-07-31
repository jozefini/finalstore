'use client';

/* eslint-disable-next-line */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable-next-line */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type AnyType = any;

// Enhanced cache wrapper with dependency tracking
export interface CacheWrapper<T = AnyType> {
  __isCached: true;
  fn: (...args: AnyType[]) => T;
  dependencies?: Set<string>;
}

// Signal system for fine-grained reactivity
export class Signal<T = AnyType> {
  private _value: T;
  private _subscribers = new Set<() => void>();
  private _version = 0;

  constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    // Track dependency during selector execution
    const context = trackingContextManager.getCurrent();
    if (context) {
      context.dependencies.add(this);
    }
    return this._value;
  }

  set value(newValue: T) {
    if (!Object.is(newValue, this._value)) {
      this._value = newValue;
      this._version++;
      this.notify();
    }
  }

  getValue(): T {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    return this.value;
  }

  get version(): number {
    return this._version;
  }

  subscribe(callback: () => void): () => void {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  private notify(): void {
    for (const callback of this._subscribers) {
      callback();
    }
  }
}

// Dependency tracking context manager
class TrackingContextManager {
  private context: { dependencies: Set<Signal> } | null = null;

  getCurrent(): { dependencies: Set<Signal> } | null {
    return this.context;
  }

  setCurrent(value: { dependencies: Set<Signal> } | null): void {
    this.context = value;
  }
}

export const trackingContextManager = new TrackingContextManager();

// For backward compatibility, export the current context
export const getCurrentTrackingContext = (): {
  dependencies: Set<Signal>;
} | null => trackingContextManager.getCurrent();

export const setCurrentTrackingContext = (
  context: { dependencies: Set<Signal> } | null
): void => {
  trackingContextManager.setCurrent(context);
};

// Helper function for tracking dependencies
export function withDependencyTracking<T>(fn: () => T): {
  result: T;
  dependencies: Set<Signal>;
} {
  const trackingContext = { dependencies: new Set<Signal>() };
  const prevContext = getCurrentTrackingContext();
  setCurrentTrackingContext(trackingContext);

  try {
    const result = fn();
    return { result, dependencies: trackingContext.dependencies };
  } finally {
    setCurrentTrackingContext(prevContext);
  }
}

// Structural sharing implementation
export class StructuralNode {
  private _data: Record<string, AnyType>;
  private _signals = new Map<string, Signal>();
  private _children = new Map<string, StructuralNode>();
  private _version = 0;
  private _path: string;

  constructor(data: Record<string, AnyType>, path = '') {
    this._data = { ...data };
    this._path = path;
    this.initializeSignals();
  }

  private initializeSignals = (): void => {
    for (const [key, value] of Object.entries(this._data)) {
      const fullPath = this._path ? `${this._path}.${key}` : key;
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        this._children.set(key, new StructuralNode(value, fullPath));
      } else {
        this._signals.set(key, new Signal(value));
      }
    }
  };

  get = (path: string): AnyType => {
    const parts = path.split('.');
    return this.getByParts(parts);
  };

  private getByParts = (parts: string[]): AnyType => {
    if (parts.length === 0) return this._data;

    const [first, ...rest] = parts;

    if (rest.length === 0) {
      const signal = this._signals.get(first);
      if (signal) {
        return signal.getValue();
      }
      const child = this._children.get(first);
      if (child) {
        return child.getData();
      }
      return this._data[first];
    }

    const child = this._children.get(first);
    if (child) {
      return child.getByParts(rest);
    }

    return undefined;
  };

  getData = (): Record<string, AnyType> => {
    const result: Record<string, AnyType> = {};

    for (const [key, signal] of this._signals) {
      result[key] = signal.getValue();
    }

    for (const [key, child] of this._children) {
      result[key] = child.getData();
    }

    return result;
  };

  set = (path: string, value: AnyType): StructuralNode => {
    const parts = path.split('.');
    return this.setByParts(parts, value);
  };

  private setByParts = (parts: string[], value: AnyType): StructuralNode => {
    if (parts.length === 1) {
      const key = parts[0];

      // Check if value is the same
      const currentValue = this.get(key);
      if (Object.is(currentValue, value)) {
        return this;
      }

      // Create new instance with structural sharing
      const newNode = new StructuralNode({}, this._path);
      newNode._version = this._version + 1;

      // Copy all signals except the changed one
      for (const [k, signal] of this._signals) {
        if (k === key) {
          const newSignal = new Signal(value);
          newSignal.value = value; // This will notify subscribers
          newNode._signals.set(k, newSignal);
        } else {
          newNode._signals.set(k, signal);
        }
      }

      // Copy all children except if we're replacing an object with a primitive
      for (const [k, child] of this._children) {
        if (k !== key) {
          newNode._children.set(k, child);
        }
      }

      // If value is an object, create a new child
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        key !== parts[0]
      ) {
        const fullPath = this._path ? `${this._path}.${key}` : key;
        newNode._children.set(key, new StructuralNode(value, fullPath));
      }

      return newNode;
    }

    const [first, ...rest] = parts;
    let child = this._children.get(first);

    if (!child) {
      // Create intermediate nodes
      const fullPath = this._path ? `${this._path}.${first}` : first;
      child = new StructuralNode({}, fullPath);
    }

    const newChild = child.setByParts(rest, value);
    if (newChild === child) {
      return this;
    }

    // Create new instance with updated child
    const newNode = new StructuralNode({}, this._path);
    newNode._version = this._version + 1;

    // Copy all signals
    for (const [k, signal] of this._signals) {
      newNode._signals.set(k, signal);
    }

    // Copy all children with the updated one
    for (const [k, c] of this._children) {
      newNode._children.set(k, k === first ? newChild : c);
    }

    return newNode;
  };

  getVersion = (): number => {
    return this._version;
  };

  getAllSignals = (prefix = ''): Map<string, Signal> => {
    const allSignals = new Map<string, Signal>();

    // Add direct signals
    for (const [key, signal] of this._signals) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      allSignals.set(fullKey, signal);
    }

    // Add child signals with path prefix
    for (const [key, child] of this._children) {
      const childPrefix = prefix ? `${prefix}.${key}` : key;
      const childSignals = child.getAllSignals(childPrefix);
      for (const [childKey, childSignal] of childSignals) {
        allSignals.set(childKey, childSignal);
      }
    }

    return allSignals;
  };
}

// LRU Cache implementation
export class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, V>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey as K);
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  get size(): number {
    return this.cache.size;
  }

  // Helper to iterate over entries
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

// Enhanced selector cache with dependency tracking
export type SelectorCacheEntry = {
  result: AnyType;
  dependencies?: Set<Signal>;
  lastUsed: number;
  computeCount: number;
  isValid: boolean;
};

// Priority scheduler for cooperative scheduling
export class PriorityScheduler {
  private highPriorityQueue: (() => void)[] = [];
  private normalPriorityQueue: (() => void)[] = [];
  private lowPriorityQueue: (() => void)[] = [];
  private isRunning = false;
  private batchDepth = 0;
  private pendingCallbacks = new Set<() => void>();

  enterBatch(): void {
    this.batchDepth++;
  }

  exitBatch(): void {
    this.batchDepth--;
    if (this.batchDepth === 0) {
      this.flushBatch();
    }
  }

  private flushBatch(): void {
    const callbacks = Array.from(this.pendingCallbacks);
    this.pendingCallbacks.clear();
    callbacks.forEach((cb) => cb());
  }

  scheduleHigh(callback: () => void): void {
    if (this.batchDepth > 0) {
      this.pendingCallbacks.add(callback);
      return;
    }
    this.highPriorityQueue.push(callback);
    this.flush();
  }

  scheduleNormal(callback: () => void): void {
    if (this.batchDepth > 0) {
      this.pendingCallbacks.add(callback);
      return;
    }
    this.normalPriorityQueue.push(callback);
    this.flush();
  }

  scheduleLow(callback: () => void): void {
    if (this.batchDepth > 0) {
      this.pendingCallbacks.add(callback);
      return;
    }
    this.lowPriorityQueue.push(callback);
    this.flush();
  }

  private flush(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    queueMicrotask(() => {
      const startTime = performance.now();
      const timeSlice = 5; // 5ms time slice

      while (performance.now() - startTime < timeSlice) {
        const callback =
          this.highPriorityQueue.shift() ||
          this.normalPriorityQueue.shift() ||
          this.lowPriorityQueue.shift();

        if (!callback) break;

        try {
          callback();
        } catch (error) {
          console.error('Scheduler error:', error);
        }
      }

      this.isRunning = false;

      // If there are still callbacks, schedule next batch
      if (
        this.highPriorityQueue.length ||
        this.normalPriorityQueue.length ||
        this.lowPriorityQueue.length
      ) {
        this.flush();
      }
    });
  }
}

// Enhanced cache function
export const cache = <T>(fn: (...args: AnyType[]) => T): CacheWrapper<T> => ({
  __isCached: true,
  fn,
  dependencies: new Set()
});

export const isCacheWrapper = (value: AnyType): value is CacheWrapper => {
  return value && typeof value === 'object' && value.__isCached === true;
};

// DevTools helper functions
export function createDevToolsIntegration(config: {
  name: string;
  onJump: (state: AnyType) => void;
  onReset: () => void;
  getState: () => AnyType;
}) {
  let devTools: AnyType = null;
  let pauseDevTools = false;

  if (
    typeof window !== 'undefined' &&
    (window as AnyType).__REDUX_DEVTOOLS_EXTENSION__
  ) {
    devTools = (window as AnyType).__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: config.name,
      trace: true,
      traceLimit: 25,
      features: {
        jump: true,
        skip: true,
        reorder: true,
        dispatch: true,
        persist: true
      }
    });

    devTools.init(config.getState());

    // Subscribe to DevTools messages for time-travel debugging
    devTools.subscribe((message: AnyType) => {
      if (message.type === 'DISPATCH') {
        switch (message.payload.type) {
          case 'JUMP_TO_ACTION':
          case 'JUMP_TO_STATE':
            try {
              const newState = JSON.parse(message.state || '{}');
              pauseDevTools = true;
              config.onJump(newState);
              pauseDevTools = false;
            } catch (error) {
              console.error('Failed to parse DevTools state:', error);
              pauseDevTools = false;
            }
            break;
          case 'RESET':
            config.onReset();
            break;
        }
      }
    });
  }

  return {
    devTools,
    pauseDevTools: () => pauseDevTools,
    setPauseDevTools: (pause: boolean) => {
      pauseDevTools = pause;
    },
    send: (actionInfo: { type: string; payload: AnyType }) => {
      if (devTools && !pauseDevTools) {
        devTools.send(actionInfo, config.getState());
      }
    }
  };
}

// Common types
export type SetFunction<TState> = (updater: (state: TState) => void) => void;

export type EventPayload<
  TEvents,
  TEventName extends keyof TEvents
> = TEvents[TEventName];

// Event system helper
export function createEventSystem<TEvents = Record<string, unknown>>() {
  const events = new Map<string, Set<(payload: AnyType) => void>>();

  function trigger<TEventName extends keyof TEvents>(
    eventName: TEventName,
    payload: EventPayload<TEvents, TEventName>
  ): void {
    const eventCallbacks = events.get(eventName as string);
    if (eventCallbacks) {
      for (const callback of eventCallbacks) {
        try {
          callback(payload);
        } catch (error) {
          console.error(
            `Error in event handler for ${String(eventName)}:`,
            error
          );
        }
      }
    }
  }

  function on<TEventName extends keyof TEvents>(
    eventName: TEventName,
    callback: (payload: EventPayload<TEvents, TEventName>) => void
  ): { off: () => void } {
    const eventKey = eventName as string;
    if (!events.has(eventKey)) {
      events.set(eventKey, new Set());
    }
    const eventCallbacks = events.get(eventKey)!;
    const typedCallback = callback as (payload: AnyType) => void;
    eventCallbacks.add(typedCallback);

    return {
      off: () => {
        eventCallbacks.delete(typedCallback);
        // Clean up empty event sets
        if (eventCallbacks.size === 0) {
          events.delete(eventKey);
        }
      }
    };
  }

  function clear(): void {
    events.clear();
  }

  return { trigger, on, clear };
}
