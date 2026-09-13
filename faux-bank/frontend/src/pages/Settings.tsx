import { useState } from 'react'
import {
  Settings as SettingsIcon, Globe, Bell, Shield, Palette,
  Database, Clock, DollarSign, Save, RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/layout/Header'
import { Alert } from '@/components/ui/Alert'

const currencyOptions = [
  { value: 'FXUSD', label: 'F$ - FauxDollar (USD)' },
  { value: 'FXEUR', label: 'F€ - FauxEuro (EUR)' },
  { value: 'FXGBP', label: 'F£ - FauxPound (GBP)' },
]

const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
]

export function Settings() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        subtitle="Configure system preferences and defaults"
      />

      {saved && (
        <Alert variant="success" title="Settings saved">
          Your changes have been saved successfully.
        </Alert>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="limits">Limits & Fees</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-600" />
                  Regional Settings
                </CardTitle>
                <CardDescription>
                  Configure currency and timezone preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Default Currency"
                  options={currencyOptions}
                  defaultValue="FXUSD"
                />
                <Select
                  label="Timezone"
                  options={timezoneOptions}
                  defaultValue="UTC"
                />
                <Input
                  label="Date Format"
                  defaultValue="MMM DD, YYYY"
                  hint="e.g., Dec 21, 2024"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  Data Retention
                </CardTitle>
                <CardDescription>
                  Configure how long data is kept in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Transaction History"
                  type="number"
                  defaultValue="365"
                  hint="Days to retain transaction records"
                />
                <Input
                  label="Audit Log Retention"
                  type="number"
                  defaultValue="730"
                  hint="Days to retain audit logs"
                />
                <Input
                  label="Authorization Expiry"
                  type="number"
                  defaultValue="7"
                  hint="Days before authorizations expire"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Simulation Settings
                </CardTitle>
                <CardDescription>
                  Configure simulation behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Auto-advance Time</p>
                    <p className="text-sm text-slate-500">Automatically advance simulated time</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Process Interest</p>
                    <p className="text-sm text-slate-500">Calculate and post interest automatically</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Expire Authorizations</p>
                    <p className="text-sm text-slate-500">Auto-expire old authorizations</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  Security
                </CardTitle>
                <CardDescription>
                  Security and access settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Session Timeout"
                  type="number"
                  defaultValue="30"
                  hint="Minutes of inactivity before logout"
                />
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Require Token for Testing</p>
                    <p className="text-sm text-slate-500">Authenticate testing endpoints</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Log All API Requests</p>
                    <p className="text-sm text-slate-500">Enable verbose request logging</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    defaultChecked
                  />
                </label>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="limits">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Transaction Limits
                </CardTitle>
                <CardDescription>
                  Default limits for transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Single Transaction Max"
                  type="number"
                  defaultValue="100000"
                  hint="Maximum amount per transaction (in dollars)"
                />
                <Input
                  label="Daily Transfer Limit"
                  type="number"
                  defaultValue="250000"
                  hint="Maximum daily transfer amount (in dollars)"
                />
                <Input
                  label="Wire Transfer Max"
                  type="number"
                  defaultValue="1000000"
                  hint="Maximum wire transfer amount (in dollars)"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Interest Rates
                </CardTitle>
                <CardDescription>
                  Default interest rates for account types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Savings APY"
                  type="number"
                  defaultValue="4.5"
                  hint="Annual percentage yield for savings"
                  step="0.01"
                />
                <Input
                  label="Money Market APY"
                  type="number"
                  defaultValue="5.0"
                  hint="Annual percentage yield for money market"
                  step="0.01"
                />
                <Input
                  label="Credit Card APR"
                  type="number"
                  defaultValue="24.99"
                  hint="Annual percentage rate for credit"
                  step="0.01"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Fee Schedule
                </CardTitle>
                <CardDescription>
                  Configure standard fees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Monthly Maintenance"
                  type="number"
                  defaultValue="5.00"
                  hint="Monthly account maintenance fee"
                  step="0.01"
                />
                <Input
                  label="Overdraft Fee"
                  type="number"
                  defaultValue="35.00"
                  hint="Fee per overdraft occurrence"
                  step="0.01"
                />
                <Input
                  label="Wire Transfer Fee"
                  type="number"
                  defaultValue="25.00"
                  hint="Fee per outgoing wire"
                  step="0.01"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-600" />
                  Rate Limiting
                </CardTitle>
                <CardDescription>
                  Default API rate limits for new agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Requests per Minute"
                  type="number"
                  defaultValue="60"
                  hint="Default requests/minute for new agents"
                />
                <Input
                  label="Transactions per Minute"
                  type="number"
                  defaultValue="10"
                  hint="Default transactions/minute for new agents"
                />
                <Input
                  label="Daily Transaction Limit"
                  type="number"
                  defaultValue="1000000"
                  hint="Default daily limit for new agents (in dollars)"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure which events trigger notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Account Events</h4>
                <div className="space-y-3 pl-4">
                  {[
                    { label: 'New account created', checked: true },
                    { label: 'Account frozen', checked: true },
                    { label: 'Account closed', checked: true },
                    { label: 'Large balance changes', checked: true },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        defaultChecked={item.checked}
                      />
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Transaction Events</h4>
                <div className="space-y-3 pl-4">
                  {[
                    { label: 'Failed transactions', checked: true },
                    { label: 'Large transactions', checked: true },
                    { label: 'Suspicious activity', checked: true },
                    { label: 'Authorization expirations', checked: false },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        defaultChecked={item.checked}
                      />
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Compliance Events</h4>
                <div className="space-y-3 pl-4">
                  {[
                    { label: 'New KYC submissions', checked: true },
                    { label: 'KYC expirations', checked: true },
                    { label: 'New disputes opened', checked: true },
                    { label: 'Dispute resolutions', checked: true },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        defaultChecked={item.checked}
                      />
                      <span className="text-sm text-slate-600">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-600" />
                Appearance Settings
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Theme</h4>
                <div className="flex gap-4">
                  {[
                    { label: 'Light', value: 'light', selected: true },
                    { label: 'Dark', value: 'dark', selected: false },
                    { label: 'System', value: 'system', selected: false },
                  ].map((theme) => (
                    <label
                      key={theme.value}
                      className={`flex-1 cursor-pointer rounded-lg border-2 p-4 text-center transition-colors ${
                        theme.selected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <input type="radio" name="theme" className="sr-only" defaultChecked={theme.selected} />
                      <span className="font-medium text-slate-900">{theme.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Accent Color</h4>
                <div className="flex gap-3">
                  {[
                    { color: 'bg-purple-600', name: 'Purple', selected: true },
                    { color: 'bg-blue-600', name: 'Blue', selected: false },
                    { color: 'bg-green-600', name: 'Green', selected: false },
                    { color: 'bg-rose-600', name: 'Rose', selected: false },
                    { color: 'bg-amber-600', name: 'Amber', selected: false },
                  ].map((accent) => (
                    <label
                      key={accent.name}
                      className="cursor-pointer"
                      title={accent.name}
                    >
                      <input type="radio" name="accent" className="sr-only" defaultChecked={accent.selected} />
                      <div
                        className={`h-10 w-10 rounded-full ${accent.color} ring-offset-2 ${
                          accent.selected ? 'ring-2 ring-purple-600' : ''
                        }`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Dashboard</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Compact mode</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Show sidebar labels</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      defaultChecked
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Animations</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      defaultChecked
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button variant="outline">
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  )
}
