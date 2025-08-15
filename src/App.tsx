import { ThemeProvider } from "@/components/theme-provider"
import { NostrProvider } from "@/contexts/NostrContext"
import Page from "@/components/page"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <NostrProvider>
        <Page />
      </NostrProvider>
    </ThemeProvider>
  )
}

export default App
