import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { useSidebar } from '@/stores'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isOpen: sidebarOpen, width: sidebarWidth } = useSidebar()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <Header />

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 overflow-auto transition-all duration-300",
            sidebarOpen ? `ml-[${sidebarWidth}px]` : "ml-0"
          )}
          style={{
            marginLeft: sidebarOpen ? `${sidebarWidth}px` : '0'
          }}
        >
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
