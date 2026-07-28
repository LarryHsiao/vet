import 'package:flutter/material.dart';

class PricingCard extends StatefulWidget {
  const PricingCard({super.key});

  @override
  State<PricingCard> createState() => _PricingCardState();
}

class _PricingCardState extends State<PricingCard> {
  String _selected = 'team';

  static const _plans = [
    {
      'id': 'starter',
      'name': 'Starter',
      'price': 19,
      'saved': '+12% this month',
    },
    {'id': 'team', 'name': 'Team', 'price': 49, 'saved': '+31% this month'},
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final plan in _plans)
          ListTile(
            title: Text(plan['name'] as String),
            subtitle: Text('\$${plan['price']} — ${plan['saved']}'),
            onTap: () => setState(() => _selected = plan['id'] as String),
          ),
        ElevatedButton(onPressed: () {}, child: const Text('Choose plan')),
        Image.network('https://via.placeholder.com/64'),
      ],
    );
  }
}
