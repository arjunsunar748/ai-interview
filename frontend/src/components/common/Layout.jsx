import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      <Sidebar />
      <main className="ml-56 pt-16 min-h-screen">
        <div className="p-6 max-w-6xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
