import { useStore } from '@/hooks/useStore';
import { useNewsletterSubscribers } from '@/hooks/useNewsletterSubscribers';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Mail } from 'lucide-react';

const Subscribers = () => {
  const { store } = useStore();
  const { data: subscribers = [], isLoading } = useNewsletterSubscribers(store?.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Newsletter Subscribers</h1>
        <p className="text-sm text-muted-foreground">{subscribers.length} subscribers</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : subscribers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="font-semibold mb-1">No subscribers yet</h3>
            <p className="text-sm text-muted-foreground">Add a Newsletter section to your homepage to start collecting emails</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0">
                    <td className="p-3">{sub.email}</td>
                    <td className="p-3 text-muted-foreground">{new Date(sub.subscribed_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Subscribers;
