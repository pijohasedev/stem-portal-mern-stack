function Badge({ text, color }) {
    const colorClasses = {
        red: 'bg-red-100 text-red-800',
        blue: 'bg-blue-100 text-blue-800',
        green: 'bg-green-100 text-green-800',
        gray: 'bg-gray-100 text-gray-800',
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color] || colorClasses.gray}`}>
            {text}
        </span>
    );
}

export default Badge;