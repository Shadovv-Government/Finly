import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout';
import { Dashboard } from './screens/Dashboard';
import { AddTransaction } from './screens/AddTransaction';
import { TransactionHistory } from './screens/TransactionHistory';
import { Analytics } from './screens/Analytics';
import { Settings } from './screens/Settings';
import { Budgets } from './screens/Budgets';
import { Goals } from './screens/Goals';
import { Categories } from './screens/Categories';
import { AIAssistant } from './screens/AIAssistant';
import { Onboarding } from './screens/Onboarding';
import { ComponentShowcase } from './screens/ComponentShowcase';

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    Component: Onboarding,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'add', Component: AddTransaction },
      { path: 'history', Component: TransactionHistory },
      { path: 'analytics', Component: Analytics },
      { path: 'settings', Component: Settings },
      { path: 'budgets', Component: Budgets },
      { path: 'goals', Component: Goals },
      { path: 'categories', Component: Categories },
      { path: 'ai-assistant', Component: AIAssistant },
      { path: 'components', Component: ComponentShowcase },
    ],
  },
]);