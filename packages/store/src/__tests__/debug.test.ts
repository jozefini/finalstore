import { describe, expect, it } from 'vitest';

import { createStore } from '../store';

describe('Debug Store Behavior', () => {
  it('should debug deep nested object updates', () => {
    console.log('🔍 Starting debug test...');

    const store = createStore({
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
        updateUserTheme: (id: number, theme: string) => {
          console.log('🚀 Action called with:', { id, theme });
          console.log('📦 Before update:', {
            userExists: !!states.users.find((u) => u.id === id),
            currentTheme: states.users.find((u) => u.id === id)?.profile
              .settings.theme,
            usersLength: states.users.length
          });

          const oldUsers = states.users;

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

          console.log('📦 After update:', {
            sameArray: oldUsers === states.users,
            newTheme: states.users.find((u) => u.id === id)?.profile.settings
              .theme,
            usersLength: states.users.length
          });
        }
      }),
      selectors: ({ states }) => ({
        getUserById: (id: number) => {
          const user = states.users.find((u) => u.id === id);
          console.log(
            '🔍 Selector called for id:',
            id,
            'found:',
            !!user,
            'theme:',
            user?.profile.settings.theme
          );
          return user;
        }
      })
    });

    // Test the flow step by step
    console.log('\n=== Initial State ===');
    const initialUser = store.get.getUserById(2);
    console.log('Initial user 2 theme:', initialUser?.profile.settings.theme);
    expect(initialUser?.profile.settings.theme).toBe('light');

    console.log('\n=== Dispatching Action ===');
    store.dispatch.updateUserTheme(2, 'dark');

    console.log('\n=== After Action ===');
    const updatedUser = store.get.getUserById(2);
    console.log('Updated user 2 theme:', updatedUser?.profile.settings.theme);

    // Let's also check the raw state
    const rawState = store.get();
    const rawUser = rawState.users.find((u) => u.id === 2);
    console.log('Raw state user 2 theme:', rawUser?.profile.settings.theme);

    expect(updatedUser?.profile.settings.theme).toBe('dark');
  });

  it('should debug matrix updates', () => {
    console.log('\n🔍 Starting matrix debug test...');

    const store = createStore({
      states: {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ]
      },
      actions: ({ states }) => ({
        updateCell: (row: number, col: number, value: number) => {
          console.log('🚀 Matrix action called with:', { row, col, value });
          console.log('📦 Before update:', {
            currentValue: states.matrix[row][col],
            matrixRef: states.matrix
          });

          const oldMatrix = states.matrix;

          const newMatrix = [...states.matrix];
          newMatrix[row] = [...newMatrix[row]];
          newMatrix[row][col] = value;
          states.matrix = newMatrix;

          console.log('📦 After update:', {
            sameMatrix: oldMatrix === states.matrix,
            newValue: states.matrix[row][col],
            matrixRef: states.matrix
          });
        }
      })
    });

    console.log('\n=== Initial Matrix State ===');
    const initialValue = store.get((state) => state.matrix[1][1]);
    console.log('Initial matrix[1][1]:', initialValue);
    expect(initialValue).toBe(5);

    console.log('\n=== Dispatching Matrix Action ===');
    store.dispatch.updateCell(1, 1, 100);

    console.log('\n=== After Matrix Action ===');
    const updatedValue = store.get((state) => state.matrix[1][1]);
    console.log('Updated matrix[1][1]:', updatedValue);

    const rawMatrix = store.get().matrix;
    console.log('Raw state matrix[1][1]:', rawMatrix[1][1]);

    expect(updatedValue).toBe(100);
  });
});
