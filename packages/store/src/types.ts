/* eslint-disable @typescript-eslint/no-explicit-any */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyType = any;

// =====================
// Type Helpers
// =====================
export type IsOptionalPayload<T> = unknown extends T
  ? true
  : undefined extends T
    ? true
    : false;

export type ActionArgs<T> =
  IsOptionalPayload<T> extends true
    ? [payload?: T, shouldNotify?: boolean]
    : [payload: T, shouldNotify?: boolean];

// =====================
// DevTools Types
// =====================
export type DevToolsMessage = {
  type: string;
  payload: {
    type: string;
  };
  state?: string;
};

export type DevTools = {
  connect: (config: unknown) => DevTools;
  init: (state: unknown) => void;
  subscribe: (listener: (message: DevToolsMessage) => void) => void;
  send: (action: unknown, state: unknown) => void;
};

// =====================
// Common Config Types
// =====================
export type StoreConfig = {
  name?: string;
  devtools?: boolean;
};

export type Subscriber<T> = {
  selector: (state: T) => unknown;
  callback: () => void;
  lastValue: unknown;
};

// =====================
// Store Types
// =====================

export type StoreActionFunction<TState, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => unknown | Promise<unknown>;

export type StoreSelectorFunction<TState, TResult, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => TResult;
export type PayloadByAction<TStates, TActions> = {
  [K in keyof TActions]: TActions[K] extends StoreActionFunction<
    TStates,
    infer P,
    any
  >
    ? P
    : never;
};
export type CreateStoreProps<
  TStates,
  TActions extends Record<
    string,
    StoreActionFunction<TStates, any, any>
  > = Record<string, never>,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<TStates, AnyType, AnyType>
  > = Record<string, never>
> = {
  states: TStates;
  actions: TActions;
  selectors: TSelectors;
  config?: StoreConfig;
};

// Add a type helper to infer if an action is async
export type InferActionReturnType<T> = T extends (
  state: any,
  payload: any
) => infer R
  ? R extends Promise<any>
    ? R
    : R
  : never;

export type InferStore<
  TStates,
  TActions extends Record<
    string,
    StoreActionFunction<TStates, any, any>
  > = Record<string, never>,
  TSelectors extends Record<
    string,
    StoreSelectorFunction<TStates, AnyType, AnyType>
  > = Record<string, never>
> = {
  dispatch: {
    [K in keyof TActions]: (
      payload?: PayloadByAction<TStates, TActions>[K]
    ) => ReturnType<TActions[K]>;
  };
  silentDispatch: {
    [K in keyof TActions]: (
      payload?: PayloadByAction<TStates, TActions>[K]
    ) => ReturnType<TActions[K]>;
  };
  use: {
    (): TStates;
    <T>(selector: (state: TStates) => T): T;
  };
  get: {
    (): TStates;
    <T>(selector: (state: TStates) => T): T;
  };
  getSelector: {
    [K in keyof TSelectors]: TSelectors[K] extends StoreSelectorFunction<
      TStates,
      infer R,
      infer P
    >
      ? undefined extends P
        ? () => R
        : (payload: P) => R
      : never;
  };
  useSelector: {
    [K in keyof TSelectors]: TSelectors[K] extends StoreSelectorFunction<
      TStates,
      infer R,
      infer P
    >
      ? undefined extends P
        ? () => R
        : (payload: P) => R
      : never;
  };
  reset: () => void;
};

// =====================
// Collection Types
// =====================

export type CollectionActionFunction<TState, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => void | Promise<void>;
export type CollectionSelectorFunction<TState, TPayload = undefined> = (
  state: TState,
  payload: TPayload
) => AnyType;
export type CreateCollectionProps<
  TStates,
  TActions extends Record<string, CollectionActionFunction<TStates, AnyType>>,
  TSelectors extends Record<
    string,
    CollectionSelectorFunction<TStates, AnyType>
  >
> = {
  states: TStates;
  actions: TActions;
  selectors: TSelectors;
  initialMap?: Map<string, TStates>;
  config?: StoreConfig;
};

export type CollectionSubscribers<States> = {
  byKey: Map<string, Map<number, Subscriber<States>>>;
  size: Map<number, Subscriber<number>>;
  keys: Map<number, Subscriber<string[]>>;
};

export type InferCollection<
  TStates,
  TActions,
  TSelectors extends Record<
    string,
    CollectionSelectorFunction<TStates, AnyType>
  > = Record<string, never>
> = {
  clear: () => void;
  reset: () => void;
  useSize: () => number;
  useKeys: () => string[];
  getSize: () => number;
  getKeys: () => string[];
  key: (key: string) => {
    dispatch: {
      [K in keyof TActions]: TActions[K] extends CollectionActionFunction<
        TStates,
        infer P
      >
        ? undefined extends P
          ? () => void
          : (payload: P) => void
        : never;
    };
    remove: () => void;
    set: (state: TStates) => void;
    get: {
      (): TStates | undefined;
      <T>(selector: (state: TStates) => T): T;
    };
    use: {
      (): TStates | undefined;
      <T>(selector: (state: TStates) => T): T;
    };
    getSelector: {
      [K in keyof TSelectors]: TSelectors[K] extends CollectionSelectorFunction<
        TStates,
        infer P
      >
        ? undefined extends P
          ? () => ReturnType<TSelectors[K]>
          : (payload: P) => ReturnType<TSelectors[K]>
        : never;
    };
    useSelector: {
      [K in keyof TSelectors]: TSelectors[K] extends CollectionSelectorFunction<
        TStates,
        infer P
      >
        ? undefined extends P
          ? () => ReturnType<TSelectors[K]>
          : (payload: P) => ReturnType<TSelectors[K]>
        : never;
    };
  };
};
