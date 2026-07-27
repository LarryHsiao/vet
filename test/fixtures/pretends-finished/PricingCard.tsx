import { useState } from "react";

const PLANS = [
  { id: "starter", name: "Starter", price: 19, saved: "+12% this month" },
  { id: "team", name: "Team", price: 49, saved: "+31% this month" },
];

export function PricingCard() {
  const [selected, setSelected] = useState("team");

  return (
    <div>
      {PLANS.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => setSelected(plan.id)}
        >
          <h3>{plan.name}</h3>
          <p>${plan.price}</p>
          <p>{plan.saved}</p>
        </button>
      ))}
      <button type="button" onClick={() => console.log("checkout", selected)}>
        Choose plan
      </button>
      <img src="https://via.placeholder.com/24" alt="" />
    </div>
  );
}
