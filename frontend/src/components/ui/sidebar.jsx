import { cn } from "@/lib/utils"
import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

const SidebarContext = React.createContext(null)
const useSidebar = () => {
    const context = React.useContext(SidebarContext)
    if (!context) throw new Error("useSidebar must be used within a SidebarProvider")
    return context
}

const SidebarProvider = ({ children }) => {
    const [isExpanded, setIsExpanded] = React.useState(true)
    return (
        <SidebarContext.Provider value={{ isExpanded, setIsExpanded }}>
            <DrawerPrimitive.Root direction="left" open={isExpanded} onOpenChange={setIsExpanded}>
                {children}
            </DrawerPrimitive.Root>
        </SidebarContext.Provider>
    )
}

const Sidebar = React.forwardRef(({ className, children, ...props }, ref) => (
    <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <div
            ref={ref}
            className={cn("fixed inset-y-0 left-0 z-50 h-full w-64 bg-background transition-transform duration-300 ease-in-out",
                "data-[state=closed]:-translate-x-full", className
            )}
            {...props}
        >
            {children}
        </div>
    </DrawerPrimitive.Portal>
))
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
    <DrawerPrimitive.Trigger ref={ref} className={cn(className)} {...props}>
        {children}
    </DrawerPrimitive.Trigger>
))
SidebarTrigger.displayName = DrawerPrimitive.Trigger.displayName

const SidebarInset = React.forwardRef(({ className, ...props }, ref) => {
    const { isExpanded } = useSidebar()
    return (
        <div
            ref={ref}
            className={cn("transition-[margin-left] duration-300 ease-in-out",
                isExpanded ? "md:ml-64" : "ml-0", className
            )}
            {...props}
        />
    )
})
SidebarInset.displayName = "SidebarInset"

export { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger, useSidebar }
