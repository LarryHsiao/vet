import { useState } from "react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    seats: 3,
    saved: "+12% this month",
  },
  { id: "team", name: "Team", price: 49, seats: 10, saved: "+31% this month" },
  {
    id: "scale",
    name: "Scale",
    price: 149,
    seats: 50,
    saved: "+8% this month",
  },
];

export function PricingCard() {
  const [selected, setSelected] = useState("team");

  return (
    <div className="grid grid-cols-3 gap-4">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className="rounded-xl border p-6 hover:border-black"
          onClick={() => setSelected(plan.id)}
        >
          <h3>{plan.name}</h3>
          <p className="text-3xl">${plan.price}</p>
          <p className="text-sm text-green-600">{plan.saved}</p>
          <span
            className="mt-4 block rounded bg-black px-4 py-2 text-white"
            onClick={() => console.log("checkout", plan.id)}
          >
            Choose plan
          </span>
        </div>
      ))}
      <button onClick={() => {}}>
        <img src="https://via.placeholder.com/24" />
      </button>
    </div>
  );
}
