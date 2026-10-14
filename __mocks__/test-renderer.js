// __mocks__/test-renderer.js
// Compatibility shim: react-test-renderer 19 removed createRoot,
// but @testing-library/react-native 14.x expects it.
const actual = jest.requireActual('react-test-renderer');

function createRoot(options) {
  let instance = null;

  return {
    render: (element) => {
      if (!instance) {
        instance = actual.create(element, options);
      } else {
        instance.update(element);
      }
    },
    unmount: () => {
      if (instance) {
        instance.unmount();
        instance = null;
      }
    },
    update: (element) => {
      if (instance) {
        instance.update(element);
      }
    },
    getInstance: () => instance ? instance.getInstance() : null,
    toJSON: () => instance ? instance.toJSON() : null,
    toTree: () => instance ? instance.toTree() : null,
    get container() {
      if (!instance) {
        return { children: [], toJSON: () => null, find: () => [], findAll: () => [], queryAll: () => [] };
      }
      try {
        const root = instance.root;
        if (!root.queryAll) {
          root.queryAll = root.findAll.bind(root);
        }
        if (!root.toJSON) {
          root.toJSON = instance.toJSON.bind(instance);
        }
        if (!root.toTree) {
          root.toTree = instance.toTree.bind(instance);
        }
        return root;
      } catch (e) {
        return { children: [], toJSON: () => null, find: () => [], findAll: () => [], queryAll: () => [] };
      }
    },
  };
}

module.exports = {
  ...actual,
  createRoot,
  act: actual.act,
};
