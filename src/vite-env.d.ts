/// <reference types="vite/client" />

// No `ImportMetaEnv` augmentation: nothing custom leaks into the
// bundle. The test-mode toggle uses Vite's built-in
// `import.meta.env.MODE`.
