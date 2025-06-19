# Store Test Suite

This directory contains comprehensive automated tests for the FinalStore library.

## Test Coverage

### Core Store Tests (`store.test.ts`)

- ✅ Store creation and initial state
- ✅ Sync and async actions
- ✅ Custom selectors
- ✅ Event system (on/off/trigger)
- ✅ Batching operations
- ✅ Reset functionality
- ✅ DevTools integration
- ✅ Error handling
- ✅ Utility functions (deepClone, isDeepEqual)
- ✅ Complex real-world scenarios

### Map Store Tests (`map.test.ts`)

- ✅ Map creation and initial state
- ✅ Key operations (set, get, remove)
- ✅ Actions on individual keys
- ✅ Async actions on keys
- ✅ Map selectors
- ✅ Batching operations
- ✅ Clear and reset operations
- ✅ Performance testing with many keys
- ✅ Edge cases and error handling

### React Integration Tests (`store-react.test.tsx`)

- ✅ React hook integration (`use`)
- ✅ Component re-rendering optimization
- ✅ Scoped store functionality
- ✅ Async actions in components
- ✅ Performance optimization tests

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test store.test.ts
```

## Test Features

- **Comprehensive Coverage**: Tests cover all major functionality including edge cases
- **Async Testing**: Proper testing of async actions and promises
- **Performance Testing**: Stress tests with large datasets
- **React Integration**: Full React component testing with React Testing Library
- **Error Handling**: Tests for graceful error handling and edge cases
- **TypeScript Support**: Full TypeScript testing with proper type checking

## Adding New Tests

When adding new features to the store, make sure to:

1. Add unit tests for the core functionality
2. Add integration tests if it affects React components
3. Test error cases and edge conditions
4. Include performance tests if relevant
5. Update this README with new test categories
