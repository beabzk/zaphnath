import { Header } from './Header'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0 px-[var(--workspace-padding)] py-[var(--workspace-padding-y)]">
        <main className="flex-1 min-w-0">
          <div className="desktop-surface h-full min-h-0 overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
