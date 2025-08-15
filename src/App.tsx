import { ThemeProvider } from "@/components/theme-provider"
import Page from "@/components/page"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Page />
    </ThemeProvider>
  )
}

export default App
