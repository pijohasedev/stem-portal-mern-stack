import { Link } from 'react-router-dom'; // Import Link

function Sidebar() {
    return (
        <aside className="w-64 bg-white shadow-lg min-h-screen">
            <nav className="mt-8">
                <div className="px-4 space-y-2">
                    {/* These are now <Link> components with a 'to' prop */}
                    <Link to="/" className="flex items-center px-4 py-3 text-red-900 bg-red-50 rounded-lg">
                        <i className="fas fa-chart-line mr-3"></i>
                        Overview
                    </Link>
                    <Link to="/users" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg">
                        <i className="fas fa-users mr-3"></i>
                        User Management
                    </Link>
                    {/* ... other links can be added later ... */}
                </div>
            </nav>
        </aside>
    );
}

export default Sidebar;