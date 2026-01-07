import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/components/NotificationProvider";
import { OneSignalProvider } from "@/components/OneSignalProvider";
import { PresenceProvider } from "@/components/PresenceProvider";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Feed from "./pages/Feed";
import Profile from "./pages/Profile";
import NotificationSettings from "./pages/NotificationSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PresenceProvider>
            <OneSignalProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/chat/:friendId" element={<Chat />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/notification-settings" element={<NotificationSettings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </OneSignalProvider>
          </PresenceProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
