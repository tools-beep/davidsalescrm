import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Edit2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Clock,
  User,
  Smartphone,
  PhoneCall,
  Calendar,
  Briefcase,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Link,
  X as XIcon,
  Copy,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ContactInformationProps {
  contactId: string;
  onEdit?: () => void;
  onClose?: () => void;
}

interface Contact {
  id: string;
  owner_id: string | null;
  first_name: string;
  last_name: string;
  primary_email: string | null;
  secondary_email: string | null;
  primary_phone: string | null;
  secondary_phone: string | null;
  mobile: string | null;
  description: string | null;
  timezone: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  linkedin_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip_code: string | null;
  last_contacted_at: string | null;
  lifecycle_stage: string | null;
  company_id: string | null;
  companies?: { name: string };
  created_at: string;
  updated_at: string;
}

interface Owner {
  id: string;
  full_name: string | null;
  email: string | null;
}

export function ContactInformation({ contactId, onEdit, onClose }: ContactInformationProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [dealCount, setDealCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<any>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchContactData();
  }, [contactId]);

  const fetchContactData = async () => {
    try {
      setLoading(true);

      // Fetch contact with company (owner info fetched separately)
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*, companies(name)')
        .eq('id', contactId)
        .single();

      if (contactError) throw contactError;
      setContact(contactData);

      // Try to fetch owner info if owner_id exists
      if (contactData.owner_id) {
        try {
          const { data: ownerData, error: ownerError } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, email')
            .eq('user_id', contactData.owner_id)
            .maybeSingle();
          
          if (ownerData && !ownerError) {
            setOwner({
              id: ownerData.user_id,
              full_name: `${ownerData.first_name || ''} ${ownerData.last_name || ''}`.trim(),
              email: ownerData.email
            });
          }
        } catch (error) {
          // User profile might not exist, that's ok
          console.log('Could not fetch owner info:', error);
        }
      }

      // Fetch deal count for this contact
      const { count, error: dealError } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .eq('primary_contact_id', contactId);

      if (dealError) throw dealError;
      setDealCount(count || 0);

    } catch (error: any) {
      console.error('Error fetching contact:', error);
    } finally {
      setLoading(false);
    }
  };

  // Inline editing functions
  const handleStartEdit = (fieldName: string, currentValue: any) => {
    setEditingField(fieldName);
    setFieldValue(currentValue || '');
  };

  const handleSaveField = async (fieldName: string, value: any) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ [fieldName]: value || null })
        .eq('id', contactId);

      if (error) throw error;

      // Update local state
      setContact({ ...contact!, [fieldName]: value });
      setEditingField(null);
      setFieldValue('');
      
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelFieldEdit = () => {
    setEditingField(null);
    setFieldValue('');
  };

  // Save both first and last name together
  const handleSaveNames = async (firstName: string, lastName: string) => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ first_name: firstName || null, last_name: lastName || null })
        .eq('id', contactId);

      if (error) throw error;

      // Update local state
      setContact({ ...contact!, first_name: firstName, last_name: lastName });
      setEditingField(null);
      setFieldValue('');
      
      toast({
        title: "Success",
        description: "Contact name updated successfully",
      });
    } catch (error) {
      console.error('Error updating contact name:', error);
      toast({
        title: "Error",
        description: "Failed to update contact name",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyName = () => {
    const fullName = `${contact?.first_name} ${contact?.last_name}`;
    navigator.clipboard.writeText(fullName);
    toast({
      title: "Copied!",
      description: `${fullName} copied to clipboard`,
    });
  };

  // Render inline editable field
  const renderEditableField = (
    fieldName: string,
    label: string,
    currentValue: any,
    type: 'text' | 'textarea' | 'email' | 'url' = 'text',
    icon?: React.ReactNode
  ) => {
    const isEditing = editingField === fieldName;
    
    return (
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-gray-500">{icon}</div>}
        <div className="flex-1 space-y-1">
          <p className="text-xs text-gray-500">{label}</p>
          {isEditing ? (
            <div className="relative">
              {type === 'textarea' ? (
                <Textarea
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  onBlur={() => handleSaveField(fieldName, fieldValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleCancelFieldEdit();
                    }
                  }}
                  className="border-primary ring-2 ring-primary/20 text-sm"
                  autoFocus
                  rows={3}
                />
              ) : (
                <Input
                  type={type === 'email' ? 'email' : type === 'url' ? 'url' : 'text'}
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  onBlur={() => handleSaveField(fieldName, fieldValue)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleCancelFieldEdit();
                    } else if (e.key === 'Enter') {
                      handleSaveField(fieldName, fieldValue);
                    }
                  }}
                  className="border-primary ring-2 ring-primary/20 text-sm"
                  autoFocus
                />
              )}
              {isSaving && (
                <div className="absolute right-2 top-2 text-xs text-muted-foreground">
                  Saving...
                </div>
              )}
            </div>
          ) : (
            <div
              className="text-sm cursor-pointer hover:bg-accent/50 p-1.5 -ml-1.5 rounded border border-transparent hover:border-border transition-all group"
              onClick={() => handleStartEdit(fieldName, currentValue)}
              title="Click to edit"
            >
              <div className="flex items-center justify-between gap-2">
                {type === 'email' && currentValue ? (
                  <a href={`mailto:${currentValue}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {currentValue}
                  </a>
                ) : type === 'url' && currentValue ? (
                  <a href={currentValue} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                    {currentValue}
                  </a>
                ) : (
                  <span className={currentValue ? "text-gray-900" : "text-gray-400"}>
                    {currentValue || 'Not set'}
                  </span>
                )}
                <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading || !contact) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();

  return (
    <Card className="h-full overflow-y-auto shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
      <CardHeader className="pb-3 bg-gradient-secondary">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-primary">Contact Information</CardTitle>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="hover:bg-primary/10">
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 p-4">
        {/* Contact Header */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xl font-bold shadow-lg">
            {initials}
          </div>
          <div className="flex-1">
            {editingField === 'name' ? (
              <div className="space-y-2 mb-2">
                <div className="flex gap-2">
                  <Input
                    value={fieldValue.first_name || ''}
                    onChange={(e) => setFieldValue({ ...fieldValue, first_name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelFieldEdit();
                      else if (e.key === 'Enter') {
                        // Save both names
                        handleSaveNames(fieldValue.first_name, fieldValue.last_name);
                      }
                    }}
                    className="border-primary ring-2 ring-primary/20 text-sm"
                    placeholder="First Name"
                    autoFocus
                  />
                  <Input
                    value={fieldValue.last_name || ''}
                    onChange={(e) => setFieldValue({ ...fieldValue, last_name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelFieldEdit();
                      else if (e.key === 'Enter') handleSaveNames(fieldValue.first_name, fieldValue.last_name);
                    }}
                    className="border-primary ring-2 ring-primary/20 text-sm"
                    placeholder="Last Name"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveNames(fieldValue.first_name, fieldValue.last_name)}
                    className="flex-1"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelFieldEdit}
                    className="flex-1"
                  >
                    <XIcon className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCopyName}
                  title="Copy name"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleStartEdit('name', { first_name: contact.first_name, last_name: contact.last_name })}
                  title="Edit name"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
            {contact.lifecycle_stage && (
              <Badge variant="outline" className="mt-1 capitalize text-xs">
                {contact.lifecycle_stage}
              </Badge>
            )}
          </div>
        </div>

        {/* Contact Owner */}
        {owner && (
          <>
            <Separator />
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Contact Owner</p>
                <p className="text-sm text-gray-900">{owner.full_name || owner.email}</p>
              </div>
            </div>
          </>
        )}

        {/* Description */}
        <Separator />
        {renderEditableField('description', 'About', contact.description, 'textarea', <User className="h-4 w-4" />)}

        {/* Company */}
        {contact.companies && (
          <>
            <Separator />
            <div className="flex items-start gap-3">
              <Briefcase className="h-4 w-4 mt-0.5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Company</p>
                <p className="text-sm text-gray-900">{contact.companies.name}</p>
              </div>
            </div>
          </>
        )}

        {/* Contact Details */}
        <Separator />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Contact Details</h3>
          
          {renderEditableField('primary_email', 'Primary Email', contact.primary_email, 'email', <Mail className="h-4 w-4" />)}
          {renderEditableField('secondary_email', 'Secondary Email', contact.secondary_email, 'email', <Mail className="h-4 w-4" />)}
          {renderEditableField('primary_phone', 'Primary Phone', contact.primary_phone, 'text', <Phone className="h-4 w-4" />)}
          {renderEditableField('secondary_phone', 'Secondary Phone', contact.secondary_phone, 'text', <PhoneCall className="h-4 w-4" />)}
          {renderEditableField('mobile', 'Mobile', contact.mobile, 'text', <Smartphone className="h-4 w-4" />)}
        </div>

        {/* Social Media & Website */}
        <Separator />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Social Media & Website</h3>
          
          {renderEditableField('website_url', 'Website', contact.website_url, 'url', <Globe className="h-4 w-4" />)}
          {renderEditableField('linkedin_url', 'LinkedIn', contact.linkedin_url, 'url', <Linkedin className="h-4 w-4" />)}
          {renderEditableField('instagram_url', 'Instagram', contact.instagram_url, 'url', <Instagram className="h-4 w-4" />)}
          {renderEditableField('facebook_url', 'Facebook', contact.facebook_url, 'url', <Facebook className="h-4 w-4" />)}
          {renderEditableField('tiktok_url', 'TikTok', contact.tiktok_url, 'url', <Link className="h-4 w-4" />)}
          {renderEditableField('x_url', 'X (Twitter)', contact.x_url, 'url', <Twitter className="h-4 w-4" />)}
        </div>

        {/* Location */}
        <Separator />
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>Location</span>
          </h3>
          
          {renderEditableField('address', 'Street Address', contact.address, 'text')}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">City</Label>
              <div
                className="text-sm cursor-pointer hover:bg-accent/50 p-1.5 rounded border border-transparent hover:border-border transition-all group"
                onClick={() => handleStartEdit('city', contact.city)}
                title="Click to edit"
              >
                {editingField === 'city' ? (
                  <Input
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onBlur={() => handleSaveField('city', fieldValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelFieldEdit();
                      else if (e.key === 'Enter') handleSaveField('city', fieldValue);
                    }}
                    className="border-primary ring-2 ring-primary/20 text-sm h-8"
                    autoFocus
                  />
                ) : (
                  <span className={contact.city ? "text-gray-900" : "text-gray-400"}>{contact.city || 'Not set'}</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">State</Label>
              <div
                className="text-sm cursor-pointer hover:bg-accent/50 p-1.5 rounded border border-transparent hover:border-border transition-all group"
                onClick={() => handleStartEdit('state', contact.state)}
                title="Click to edit"
              >
                {editingField === 'state' ? (
                  <Input
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onBlur={() => handleSaveField('state', fieldValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelFieldEdit();
                      else if (e.key === 'Enter') handleSaveField('state', fieldValue);
                    }}
                    className="border-primary ring-2 ring-primary/20 text-sm h-8"
                    autoFocus
                  />
                ) : (
                  <span className={contact.state ? "text-gray-900" : "text-gray-400"}>{contact.state || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">ZIP Code</Label>
              <div
                className="text-sm cursor-pointer hover:bg-accent/50 p-1.5 rounded border border-transparent hover:border-border transition-all group"
                onClick={() => handleStartEdit('zip_code', contact.zip_code)}
                title="Click to edit"
              >
                {editingField === 'zip_code' ? (
                  <Input
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onBlur={() => handleSaveField('zip_code', fieldValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelFieldEdit();
                      else if (e.key === 'Enter') handleSaveField('zip_code', fieldValue);
                    }}
                    className="border-primary ring-2 ring-primary/20 text-sm h-8"
                    autoFocus
                  />
                ) : (
                  <span className={contact.zip_code ? "text-gray-900" : "text-gray-400"}>{contact.zip_code || 'Not set'}</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Country</Label>
              <div
                className="text-sm cursor-pointer hover:bg-accent/50 p-1.5 rounded border border-transparent hover:border-border transition-all group"
                onClick={() => handleStartEdit('country', contact.country)}
                title="Click to edit"
              >
                {editingField === 'country' ? (
                  <Input
                    value={fieldValue}
                    onChange={(e) => setFieldValue(e.target.value)}
                    onBlur={() => handleSaveField('country', fieldValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelFieldEdit();
                      else if (e.key === 'Enter') handleSaveField('country', fieldValue);
                    }}
                    className="border-primary ring-2 ring-primary/20 text-sm h-8"
                    autoFocus
                  />
                ) : (
                  <span className={contact.country ? "text-gray-900" : "text-gray-400"}>{contact.country || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timezone */}
        <Separator />
        {renderEditableField('timezone', 'Timezone', contact.timezone, 'text', <Globe className="h-4 w-4" />)}

        {/* Last Contacted */}
        {contact.last_contacted_at && (
          <>
            <Separator />
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Last Contacted</p>
                <p className="text-sm text-gray-900">
                  {formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(contact.last_contacted_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Number of Associated Deals */}
        <Separator />
        <div className="flex items-start gap-3">
          <Briefcase className="h-4 w-4 mt-0.5 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Associated Deals</p>
            <p className="text-sm font-semibold text-gray-900">{dealCount}</p>
          </div>
        </div>

        {/* Timestamps */}
        <Separator />
        <div className="space-y-2 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Created:</span>
            <span>{new Date(contact.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated:</span>
            <span>{new Date(contact.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
