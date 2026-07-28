import { format } from "date-fns";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import "./styles/app.css";
import "./styles/missing.css";
import "./notes.txt?raw";

export function App() {
  return (
    <div>
      <Header />
      <Sidebar />
      <p>{format(new Date(), "yyyy-MM-dd")}</p>
    </div>
  );
}
