import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function Navigation() {
  return (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
