const { createStore } = require('./src/store.tsx');

console.log('🔍 Debugging store behavior...');

// Test 1: Simple deep nested object update
console.log('\n=== Test 1: Deep nested object ===');
const store1 = createStore({
  states: {
    users: Array.from({ length: 5 }, (_, i) => ({
      id: i,
      profile: {
        name: `User ${i}`,
        settings: { theme: 'light', notifications: true }
      }
    }))
  },
  actions: ({ states }) => ({
    updateUserTheme: (id, theme) => {
      console.log(
        `Before update:`,
        states.users.find((u) => u.id === id)?.profile.settings.theme
      );

      states.users = states.users.map((user) =>
        user.id === id
          ? {
              ...user,
              profile: {
                ...user.profile,
                settings: { ...user.profile.settings, theme }
              }
            }
          : user
      );

      console.log(
        `After update:`,
        states.users.find((u) => u.id === id)?.profile.settings.theme
      );
    }
  }),
  selectors: ({ states }) => ({
    getUserById: (id) => states.users.find((u) => u.id === id)
  })
});

console.log(
  'Initial user 2:',
  store1.get.getUserById(2)?.profile.settings.theme
);
store1.dispatch.updateUserTheme(2, 'dark');
console.log(
  'Updated user 2:',
  store1.get.getUserById(2)?.profile.settings.theme
);

// Test 2: Matrix update
console.log('\n=== Test 2: Matrix update ===');
const store2 = createStore({
  states: {
    matrix: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9]
    ]
  },
  actions: ({ states }) => ({
    updateCell: (row, col, value) => {
      console.log(
        `Before update: matrix[${row}][${col}] =`,
        states.matrix[row][col]
      );

      const newMatrix = [...states.matrix];
      newMatrix[row] = [...newMatrix[row]];
      newMatrix[row][col] = value;
      states.matrix = newMatrix;

      console.log(
        `After update: matrix[${row}][${col}] =`,
        states.matrix[row][col]
      );
    }
  })
});

console.log(
  'Initial matrix[1][1]:',
  store2.get((state) => state.matrix[1][1])
);
store2.dispatch.updateCell(1, 1, 100);
console.log(
  'Updated matrix[1][1]:',
  store2.get((state) => state.matrix[1][1])
);

console.log('\n✅ Debug complete');
