import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { marketplaceApi } from '../api';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthProvider';
import { ErrorState, LoadingState } from '../components/ui/AsyncState';
import { FormField } from '../components/ui/FormField';

const profileKey = ['customer-profile'] as const;
const schema = z.object({ name: z.string().min(2, 'Enter your name.'), email: z.email('Enter a valid email.'), mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number.'), marketingOptIn: z.boolean() });
type ProfileForm = z.infer<typeof schema>;

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { updateCustomer } = useAuth();
  const [saved, setSaved] = useState(false);
  const profile = useQuery({ queryKey: profileKey, queryFn: () => marketplaceApi.getCustomerProfile() });
  const form = useForm<ProfileForm>({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', mobile: '', marketingOptIn: false } });
  useEffect(() => { if (profile.data) form.reset(profile.data); }, [form, profile.data]);
  const update = useMutation({ mutationFn: (input: ProfileForm) => marketplaceApi.updateCustomerProfile(input), onSuccess: (next) => { queryClient.setQueryData(profileKey, next); updateCustomer(next); setSaved(true); } });
  if (profile.isLoading) return <div className="page shell"><LoadingState label="Loading your profile" /></div>;
  if (profile.isError) return <div className="page shell"><ErrorState message={getErrorMessage(profile.error)} onRetry={() => void profile.refetch()} /></div>;
  return <div className="page shell profile-page"><div className="page-heading"><div><span className="eyebrow">Account settings</span><h1>Customer profile</h1><p>Keep your contact information current for orders and support.</p></div><Link className="button button--secondary" to="/addresses"><MapPin size={17} /> Manage addresses</Link></div>{profile.data?.mobileVerified ? <div className="verification-banner verification-banner--verified"><ShieldCheck /><div><strong>Mobile number verified</strong><span>Order and security updates can be delivered to {profile.data.mobile}.</span></div></div> : <div className="verification-banner"><AlertCircle /><div><strong>Mobile verification required</strong><span>Verify {profile.data?.mobile} to receive account and order updates.</span></div><Link className="button button--primary" to="/verify-mobile">Verify now</Link></div>}<form className="profile-form" onSubmit={(event) => void form.handleSubmit((values) => { setSaved(false); update.mutate(values); })(event)}><FormField label="Full name" autoComplete="name" registration={form.register('name')} error={form.formState.errors.name} /><FormField label="Email" type="email" autoComplete="email" registration={form.register('email')} error={form.formState.errors.email} /><FormField label="Mobile" inputMode="numeric" autoComplete="tel" registration={form.register('mobile')} error={form.formState.errors.mobile} /><label className="checkbox-field form-span"><input type="checkbox" {...form.register('marketingOptIn')} /> Receive optional marketplace updates</label>{saved && <p className="success-inline form-span"><CheckCircle2 size={17} /> Profile updated.{profile.data?.mobileVerified === false ? ' Please verify the new mobile number.' : ''}</p>}{update.isError && <p className="form-error form-span">{getErrorMessage(update.error)}</p>}<div className="form-actions form-span"><button className="button button--primary" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save profile'}</button></div></form></div>;
}
