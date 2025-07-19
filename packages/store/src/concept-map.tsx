import { createMap } from './map';

type States = {
  text: string;
  completed: boolean;
};
type Actions = {
  toggle: () => void;
  text: (text: string) => void;
};
type Selectors = {
  text: () => string;
};
type MapSelectors = {
  completedTasks: () => States[];
};

export const collection = createMap<States, Actions, Selectors, MapSelectors>({
  states: {
    text: '',
    completed: false
  },
  actions: ({ states, invalidate, invalidateMap }) => ({
    toggle: () => {
      states.completed = !states.completed;
      invalidate('isCompleted');
      invalidateMap('completedTasks');
    },
    text: (text: string) => {
      states.text = text;
    }
  }),
  cacheSelectors: ['text', 'isCompleted'],
  cacheMapSelectors: ['completedTasks'],
  selectors: ({ states }) => ({
    text: () => {
      console.log('selectors.text');
      return states.text;
    },
    isCompleted: () => {
      console.log('selectors.isCompleted');
      return states.completed;
    }
  }),
  mapSelectors: ({ map }) => ({
    completedTasks: () => {
      return map.filter((item) => item.states.completed);
    }
  })
});

// usage
collection.key('1').set({ text: 'Buy groceries', completed: false });
collection.key('1').dispatch.toggle();

function ReactiveComponent() {
  const isFirstCompleted = collection.key('1').use.isCompleted();
  const completedTasks = collection.use.completedTasks();

  return <div>Completed Tasks: {completedTasks.length}</div>;
}
