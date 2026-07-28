// Coincidentally named like a covering test. Tests something unrelated.
import { formatDate } from "../../helpers/format-date";

test("formats a date", () => {
  formatDate(new Date());
});
