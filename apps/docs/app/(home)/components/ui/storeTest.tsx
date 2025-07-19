'use client';

import { createStore } from '../../../../../../packages/store/src/index';

type States = {
  text: string;
  text2: string;
  text3: string;
};
type Actions = {
  setText: (text: string) => void;
  setText2: (text: string) => void;
  setText3: (text: string) => void;
};
type Selectors = {
  text: () => string;
  text2: () => string;
  text3: () => string;
};

const store = createStore<States, Actions, Selectors>({
  states: {
    text: '',
    text2: '',
    text3: ''
  },
  actions: ({ states, invalidate }) => ({
    setText: (text: string) => {
      states.text = text;
    },
    setText2: (text: string) => {
      states.text2 = text;
      invalidate(['text2', 'text3']);
    },
    setText3: (text: string) => {
      states.text3 = text;
      invalidate('text3');
    }
  }),
  cacheSelectors: ['text2', 'text3'],
  selectors: ({ states }) => ({
    text: () => {
      return states.text;
    },
    text2: () => {
      let result = 0;
      // Perform some heavy computation
      for (let i = 0; i < 10000000; i++) {
        result += i;
      }
      console.log('text2', result);
      return states.text2;
    },
    text3: () => {
      console.log('text3');
      return states.text3;
    }
  })
});

const Title = () => {
  const text = store.use.text();

  return (
    <h1 className="mb-4 text-base font-bold tracking-tight text-gray-900">
      {text || 'Enter some text...'}
    </h1>
  );
};

const Title2 = () => {
  const text2 = store.use.text2();

  return (
    <h1 className="mb-4 text-base font-bold tracking-tight text-gray-900">
      {text2 || 'Enter some text...'}
    </h1>
  );
};

const Title3 = () => {
  const text3 = store.use.text3();

  return (
    <h1 className="mb-4 text-base font-bold tracking-tight text-gray-900">
      {text3 || 'Enter some text...'}
    </h1>
  );
};

const Input = () => {
  const text = store.use.text();

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => store.dispatch.setText(e.target.value)}
      className="block w-full rounded-md border-gray-300 bg-white p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      placeholder="Type something..."
    />
  );
};

const Input2 = () => {
  const text2 = store.use.text2();

  return (
    <input
      type="text"
      value={text2}
      onChange={(e) => store.dispatch.setText2(e.target.value)}
      className="block w-full rounded-md border-gray-300 bg-white p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      placeholder="Type something..."
    />
  );
};

const Input3 = () => {
  const text3 = store.use.text3();

  return (
    <input
      type="text"
      value={text3}
      onChange={(e) => store.dispatch.setText3(e.target.value)}
      className="block w-full rounded-md border-gray-300 bg-white p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      placeholder="Type something..."
    />
  );
};

export function StoreTest() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-8">
      <Title />
      <Input />
      <br />
      <Title2 />
      <Input2 />
      <br />
      <Title3 />
      <Input3 />
    </div>
  );
}
