import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { TestComponent } from './TestComponent';

function App() {
  return (
    <MantineProvider>
      <TestComponent />
    </MantineProvider>
  );
}

export default App