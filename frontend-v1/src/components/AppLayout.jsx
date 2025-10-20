import Sidebar from "./Sidebar"; // Import the Sidebar here

function AppLayout({ children }) {
    return (
        <div className="flex bg-gray-50 min-h-screen">
            {/* The Sidebar is now a permanent part of the layout */}
            <Sidebar />

            {/* The main content area will take up the remaining space */}
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    );
}

export default AppLayout;