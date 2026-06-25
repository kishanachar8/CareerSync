// Runtime reference to the Redux store, set once by app/store.js right after
// it's created. axiosInstance.js reads the store through this indirection
// instead of `import store from '../app/store.js'` directly — that static
// import was the root cause of a circular-dependency cycle: every feature
// slice's thunk imports an api*.js file, every api*.js file imports
// axiosInstance.js, and axiosInstance.js imported store.js right back,
// closing the loop through every single slice.
let storeRef = null;

export const injectStore = (store) => {
  storeRef = store;
};

export const getStore = () => storeRef;
