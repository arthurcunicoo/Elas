import { FeaturePage } from '../components/shared/FeaturePage';
import { NotificationsList } from '../features/community/NotificationsList';
export default function Notifications() {
  return (
    <FeaturePage title="Notificações" scroll={false}>
      <NotificationsList />
    </FeaturePage>
  );
}
