import * as React from "react";

export const Accordion = ({ type = "single", children, className = "" }) => {
    const [openItems, setOpenItems] = React.useState([]);

    const toggleItem = (value) => {
        if (type === "single") {
            setOpenItems(openItems[0] === value ? [] : [value]);
        } else {
            setOpenItems((prev) =>
                prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
            );
        }
    };

    return <div className={`space-y-2 ${className}`}>{React.Children.map(children, (child) =>
        React.cloneElement(child, {
            isOpen: openItems.includes(child.props.value),
            onToggle: () => toggleItem(child.props.value)
        })
    )}</div>;
};

export const AccordionItem = ({ value, children, isOpen, onToggle }) => {
    return (
        <div className="border rounded-lg">
            {React.Children.map(children, (child) =>
                React.cloneElement(child, { isOpen, onToggle })
            )}
        </div>
    );
};

export const AccordionTrigger = ({ children, isOpen, onToggle }) => (
    <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-medium text-gray-900 bg-gray-100 rounded-t-lg hover:bg-gray-200"
    >
        <span>{children}</span>
        <span className="text-gray-500">{isOpen ? "−" : "+"}</span>
    </button>
);

export const AccordionContent = ({ children, isOpen }) => (
    <div
        className={`px-4 overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[1000px] py-3" : "max-h-0 py-0"
            }`}
    >
        {isOpen && <div>{children}</div>}
    </div>
);
