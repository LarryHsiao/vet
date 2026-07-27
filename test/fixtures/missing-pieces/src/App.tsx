import { format } from "date-fns";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function App() {
  return (
    <div>
      <Header />
      <Sidebar />
      <p>{format(new Date(), "yyyy-MM-dd")}</p>
    </div>
  );
}
