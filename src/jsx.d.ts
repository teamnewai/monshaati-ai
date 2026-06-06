// Global JSX namespace - provided by @types/react in real environment
declare namespace JSX {
  interface Element extends React.ReactElement<any, any> {}
  interface ElementClass extends React.Component<any> {
    render(): React.ReactNode;
  }
  interface ElementAttributesProperty { props: {}; }
  interface ElementChildrenAttribute { children: {}; }
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface IntrinsicAttributes {
    key?: React.Key | null;
  }
  interface IntrinsicClassAttributes<T> {
    ref?: React.Ref<T>;
  }
}
