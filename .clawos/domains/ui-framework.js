/**
 * @module domains/ui-framework
 * @description Domain knowledge for UI/Frontend framework generation.
 */

const UI_FRAMEWORK_DOMAIN = {
  id: 'ui',
  name: 'UI / Frontend Framework',
  description: 'Frameworks for building user interfaces, component libraries, design systems, and frontend applications',

  coreConcepts: [
    'component-model',
    'reactivity',
    'state-management',
    'rendering',
    'virtual-dom',
    'templating',
    'styling',
    'routing',
    'event-handling',
    'lifecycle-hooks',
    'data-binding',
    'accessibility',
  ],

  architecturalStyles: {
    component: {
      name: 'Component-Based',
      description: 'Encapsulated, reusable UI components (React, Vue, Svelte style)',
      patterns: ['component-tree', 'props-down-events-up', 'composition', 'render-function'],
    },
    reactive: {
      name: 'Reactive / Signal-Based',
      description: 'Fine-grained reactivity with signals/observables (SolidJS, Angular Signals)',
      patterns: ['signal', 'computed', 'effect', 'reactive-store'],
    },
    template: {
      name: 'Template-Driven',
      description: 'HTML-first templates with directives (Angular, Vue template)',
      patterns: ['template-compiler', 'directive', 'two-way-binding'],
    },
    hybrid: {
      name: 'SSR + Client Hybrid',
      description: 'Server-rendered with client hydration (Next.js, Nuxt style)',
      patterns: ['island-architecture', 'hydration', 'server-component'],
    },
  },

  directoryStructure: {
    src: {
      core: 'Core runtime — reactivity, rendering, lifecycle',
      components: 'Built-in components — if, each, portal, suspense',
      router: 'Client-side routing',
      store: 'State management',
      hooks: 'Reusable hooks / composables',
      directives: 'Template directives (if template-driven)',
      utils: 'Utility functions — DOM helpers, class merging',
      styles: 'Style system — CSS-in-JS, scoped styles',
      'index.js': 'Public API exports',
    },
    tests: {
      components: 'Component render tests',
      reactivity: 'Reactivity system tests',
      integration: 'Integration tests',
    },
  },

  requiredModules: [
    {
      name: 'Reactivity System',
      responsibility: 'Track dependencies and trigger updates when state changes',
      interface: {
        methods: ['signal(initialValue)', 'computed(fn)', 'effect(fn)', 'batch(fn)'],
      },
    },
    {
      name: 'Component Model',
      responsibility: 'Define, create, and mount components',
      interface: {
        methods: ['defineComponent(options)', 'createComponent(definition, props)', 'mount(component, target)', 'unmount(component)'],
      },
    },
    {
      name: 'Renderer',
      responsibility: 'Render components to DOM, handle updates efficiently',
      interface: {
        methods: ['render(vnode, container)', 'patch(oldVNode, newVNode)', 'createElement(tag, props, children)', 'createTextNode(text)'],
      },
    },
    {
      name: 'Event System',
      responsibility: 'Handle DOM events with delegation',
      interface: {
        methods: ['on(element, event, handler)', 'off(element, event, handler)', 'delegate(container, selector, event, handler)', 'emit(element, event, data)'],
      },
    },
    {
      name: 'Lifecycle Manager',
      responsibility: 'Manage component lifecycle hooks',
      interface: {
        methods: ['onMount(fn)', 'onUnmount(fn)', 'onUpdate(fn)', 'onError(fn)'],
      },
    },
  ],

  optionalModules: [
    { name: 'Router', triggers: ['router', 'routing', 'spa', 'navigation', 'pages'], provides: ['client-side routing', 'nested routes', 'lazy loading', 'route guards'] },
    { name: 'State Store', triggers: ['store', 'state', 'redux', 'global state'], provides: ['global store', 'actions', 'getters', 'devtools'] },
    { name: 'Style System', triggers: ['css', 'styled', 'theme', 'design system'], provides: ['scoped CSS', 'CSS-in-JS', 'theming', 'design tokens'] },
    { name: 'SSR Engine', triggers: ['ssr', 'server', 'hydration', 'seo'], provides: ['server rendering', 'hydration', 'streaming SSR'] },
    { name: 'Animation', triggers: ['animation', 'transition', 'motion'], provides: ['CSS transitions', 'JS animations', 'spring physics'] },
  ],

  referenceFrameworks: [
    { name: 'React', style: 'virtual-dom', strength: 'ecosystem + hooks' },
    { name: 'Vue', style: 'progressive', strength: 'approachable + versatile' },
    { name: 'Svelte', style: 'compile-time', strength: 'no runtime + fast' },
    { name: 'SolidJS', style: 'fine-grained', strength: 'performance + signals' },
    { name: 'Lit', style: 'web-components', strength: 'standards-based' },
  ],

  codePatterns: {
    signal: `
export function createSignal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();
  const read = () => {
    if (currentEffect) subscribers.add(currentEffect);
    return value;
  };
  const write = (newValue) => {
    if (newValue === value) return;
    value = typeof newValue === 'function' ? newValue(value) : newValue;
    subscribers.forEach(fn => fn());
  };
  return [read, write];
}`,
    component: `
export function defineComponent(setup) {
  return function Component(props = {}) {
    const instance = { props, state: {}, effects: [], mounted: false };
    const { template, ...methods } = setup(props);
    Object.assign(instance, methods);
    instance.render = () => template(instance);
    return instance;
  };
}`,
  },

  testingStrategies: {
    unit: ['Test reactivity system independently', 'Test component rendering output', 'Test event handler binding', 'Test lifecycle hook ordering'],
    integration: ['Test component tree rendering', 'Test state propagation through tree', 'Test router navigation'],
  },
};

export default UI_FRAMEWORK_DOMAIN;
