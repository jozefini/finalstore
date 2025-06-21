// Simple test for the deep proxy system
const createReactiveProxy = (obj, onMutate) => {
  const proxyCache = new WeakMap();
  
  function wrap(value) {
    if (typeof value !== 'object' || value === null) return value;
    if (proxyCache.has(value)) return proxyCache.get(value);
    
    if (value instanceof Date || value instanceof Map || value instanceof Set) {
      return value;
    }
    
    const proxy = new Proxy(value, {
      get(target, key, receiver) {
        const result = Reflect.get(target, key, receiver);
        return typeof result === 'function' ? result : wrap(result);
      },
      set(target, key, newValue, receiver) {
        const oldValue = target[key];
        const result = Reflect.set(target, key, newValue, receiver);
        if (oldValue !== newValue && onMutate) {
          console.log(`Mutation detected: ${String(key)} changed from`, oldValue, 'to', newValue);
          onMutate(target, key, newValue, oldValue);
        }
        return result;
      }
    });
    
    proxyCache.set(value, proxy);
    return proxy;
  }
  
  return wrap(obj);
};

// Test basic mutations
const state = { count: 0, items: [], user: { name: 'John' } };
let mutationCount = 0;

const proxy = createReactiveProxy(state, () => {
  mutationCount++;
});

console.log('=== Testing Deep Proxy System ===\n');

console.log('1. Initial state:', JSON.stringify(proxy));
console.log('   Mutations so far:', mutationCount);

console.log('\n2. Testing shallow mutation...');
proxy.count = 5;
console.log('   Count after mutation:', proxy.count);
console.log('   Mutations so far:', mutationCount);

console.log('\n3. Testing array push...');
proxy.items.push('item1');
console.log('   Items after push:', JSON.stringify(proxy.items));
console.log('   Mutations so far:', mutationCount);

console.log('\n4. Testing deep mutation...');
proxy.user.name = 'Jane';
console.log('   User name after mutation:', proxy.user.name);
console.log('   Mutations so far:', mutationCount);

console.log('\n=== Test completed ===');
