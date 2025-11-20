import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { X, CalendarIcon, RefreshCw, Search, Check, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AdvancedFilterState {
  stages: string[];
  priorities: string[];
  amountRange: [number, number];
  dateRange: { from?: Date; to?: Date };
  companies: string[];
  dealOwners: string[];
  accountManagers: string[];
  setters: string[];
  currencies: string[];
  timezones: string[];
  verticals: string[];
  dealSources: string[];
  annualRevenue: string[];
  productSegments: string[];
  cities: string[];
  states: string[];
  countries: string[];
}

interface AdvancedFiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilterState;
  onFiltersChange: (filters: AdvancedFilterState) => void;
  dealStages: string[];
  companies: Array<{ id: string; name: string }>;
  users: Array<{ user_id: string; first_name: string; last_name: string; email: string; role: string }>;
  timezones: string[];
  cities: string[];
  states: string[];
  countries: string[];
}

const priorities = ['high', 'medium', 'low'];
const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];
const annualRevenueOptions = ['<100k', '100-250k', '251-500k', '500k-1M', '1M+'];
const dealSourceOptions = ['Website', 'Referral', 'LinkedIn', 'Cold Outbound', 'Webinar', 'Email', 'Other'];

const verticalOptions = [
  'Real Estate', 'Dentals', 'Legal', 'Professional Services',
  'Accounting & Bookkeeping Firms', 'Financial Advisors / Wealth Management',
  'Medical Clinics (Private Practices)', 'Chiropractors', 'Physical Therapy Clinics',
  'Cleaning Companies', 'HVAC / Plumbing / Electrical Contractors',
  'Online Course Creators / EdTech', 'Life Coaches & Business Coaches',
  'Other'
];

export function AdvancedFiltersSidebar({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  dealStages,
  companies,
  users,
  timezones,
  cities,
  states,
  countries,
}: AdvancedFiltersSidebarProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilterState>(filters);
  const [companySearch, setCompanySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [verticalDropdownOpen, setVerticalDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key: keyof AdvancedFilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleArrayFilter = (key: keyof AdvancedFilterState, value: string) => {
    const currentArray = localFilters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    const clearedFilters: AdvancedFilterState = {
      stages: [],
      priorities: [],
      amountRange: [0, 1000000],
      dateRange: {},
      companies: [],
      dealOwners: [],
      accountManagers: [],
      setters: [],
      currencies: [],
      timezones: [],
      verticals: [],
      dealSources: [],
      annualRevenue: [],
      productSegments: [],
      cities: [],
      states: [],
      countries: [],
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.stages.length > 0) count++;
    if (localFilters.priorities.length > 0) count++;
    if (localFilters.amountRange[0] > 0 || localFilters.amountRange[1] < 1000000) count++;
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    if (localFilters.companies.length > 0) count++;
    if (localFilters.dealOwners.length > 0) count++;
    if (localFilters.accountManagers.length > 0) count++;
    if (localFilters.setters.length > 0) count++;
    if (localFilters.currencies.length > 0) count++;
    if (localFilters.timezones.length > 0) count++;
    if (localFilters.verticals.length > 0) count++;
    if (localFilters.dealSources.length > 0) count++;
    if (localFilters.annualRevenue.length > 0) count++;
    if (localFilters.productSegments.length > 0) count++;
    if (localFilters.cities.length > 0) count++;
    if (localFilters.states.length > 0) count++;
    if (localFilters.countries.length > 0) count++;
    return count;
  };

  const getUserDisplayName = (user: any) => {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    getUserDisplayName(u).toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[540px] p-0">
        <ScrollArea className="h-full">
          <div className="flex flex-col h-full">
            {/* Header */}
            <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-xl">All Filters</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} active
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getActiveFiltersCount() > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            {/* Filters Content */}
            <div className="px-6 py-4 space-y-6">
              {/* Deal Stage */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Deal Stage</Label>
                <Popover open={stageDropdownOpen} onOpenChange={setStageDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {localFilters.stages.length > 0
                        ? `${localFilters.stages.length} selected`
                        : "Select stages"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search stages..." />
                      <CommandList>
                        <CommandEmpty>No stages found</CommandEmpty>
                        <CommandGroup>
                          {dealStages.map((stage) => (
                            <CommandItem
                              key={stage}
                              onSelect={() => toggleArrayFilter('stages', stage)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={localFilters.stages.includes(stage)}
                                className="mr-2"
                              />
                              <span className="capitalize">{stage}</span>
                              {localFilters.stages.includes(stage) && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {localFilters.stages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localFilters.stages.map((stage) => (
                      <Badge key={stage} variant="default" className="capitalize">
                        {stage}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => toggleArrayFilter('stages', stage)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Priority */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Priority</Label>
                <div className="flex gap-2">
                  {priorities.map((priority) => (
                    <Badge
                      key={priority}
                      variant={localFilters.priorities.includes(priority) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105 capitalize"
                      onClick={() => toggleArrayFilter('priorities', priority)}
                    >
                      {priority}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Deal Amount Range */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Deal Amount: ${localFilters.amountRange[0].toLocaleString()} - ${localFilters.amountRange[1].toLocaleString()}
                </Label>
                <Slider
                  min={0}
                  max={1000000}
                  step={10000}
                  value={localFilters.amountRange}
                  onValueChange={(value) => updateFilter('amountRange', value as [number, number])}
                  className="mt-2"
                />
              </div>

              <Separator />

              {/* Close Date Range */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Close Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateRange.from ? format(localFilters.dateRange.from, "PPP") : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateRange.from}
                        onSelect={(date) => updateFilter('dateRange', { ...localFilters.dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.dateRange.to ? format(localFilters.dateRange.to, "PPP") : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.dateRange.to}
                        onSelect={(date) => updateFilter('dateRange', { ...localFilters.dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator />

              {/* Deal Owner */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Deal Owner</Label>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <Badge
                      key={user.user_id}
                      variant={localFilters.dealOwners.includes(user.user_id) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayFilter('dealOwners', user.user_id)}
                    >
                      {getUserDisplayName(user)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Account Manager */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Account Manager</Label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {users.map((user) => (
                    <Badge
                      key={user.user_id}
                      variant={localFilters.accountManagers.includes(user.user_id) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayFilter('accountManagers', user.user_id)}
                    >
                      {getUserDisplayName(user)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Sales Development Representative */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Sales Development Representative</Label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {users.map((user) => (
                    <Badge
                      key={user.user_id}
                      variant={localFilters.setters.includes(user.user_id) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayFilter('setters', user.user_id)}
                    >
                      {getUserDisplayName(user)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Companies */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Companies</Label>
                <Popover open={companyDropdownOpen} onOpenChange={setCompanyDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {localFilters.companies.length > 0
                        ? `${localFilters.companies.length} selected`
                        : "Select companies"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search companies..." />
                      <CommandList>
                        <CommandEmpty>No companies found</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {companies.map((company) => (
                            <CommandItem
                              key={company.id}
                              onSelect={() => toggleArrayFilter('companies', company.id)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={localFilters.companies.includes(company.id)}
                                className="mr-2"
                              />
                              <span>{company.name}</span>
                              {localFilters.companies.includes(company.id) && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {localFilters.companies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localFilters.companies.map((companyId) => {
                      const company = companies.find(c => c.id === companyId);
                      return company ? (
                        <Badge key={companyId} variant="default">
                          {company.name}
                          <X
                            className="ml-1 h-3 w-3 cursor-pointer"
                            onClick={() => toggleArrayFilter('companies', companyId)}
                          />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* Deal Source */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Deal Source</Label>
                <div className="flex flex-wrap gap-2">
                  {dealSourceOptions.map((source) => (
                    <Badge
                      key={source}
                      variant={localFilters.dealSources.includes(source) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayFilter('dealSources', source)}
                    >
                      {source}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Vertical */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Vertical</Label>
                <Popover open={verticalDropdownOpen} onOpenChange={setVerticalDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {localFilters.verticals.length > 0
                        ? `${localFilters.verticals.length} selected`
                        : "Select verticals"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search verticals..." />
                      <CommandList>
                        <CommandEmpty>No verticals found</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {verticalOptions.map((vertical) => (
                            <CommandItem
                              key={vertical}
                              onSelect={() => toggleArrayFilter('verticals', vertical)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={localFilters.verticals.includes(vertical)}
                                className="mr-2"
                              />
                              <span>{vertical}</span>
                              {localFilters.verticals.includes(vertical) && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {localFilters.verticals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localFilters.verticals.map((vertical) => (
                      <Badge key={vertical} variant="default">
                        {vertical}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => toggleArrayFilter('verticals', vertical)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Annual Revenue */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Annual Revenue</Label>
                <div className="flex flex-wrap gap-2">
                  {annualRevenueOptions.map((revenue) => (
                    <Badge
                      key={revenue}
                      variant={localFilters.annualRevenue.includes(revenue) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayFilter('annualRevenue', revenue)}
                    >
                      {revenue}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Currency */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Currency</Label>
                <div className="flex flex-wrap gap-2">
                  {currencies.map((currency) => (
                    <Badge
                      key={currency}
                      variant={localFilters.currencies.includes(currency) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayFilter('currencies', currency)}
                    >
                      {currency}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Timezone */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Timezone</Label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {timezones.map((timezone) => (
                    <Badge
                      key={timezone}
                      variant={localFilters.timezones.includes(timezone) ? "default" : "outline"}
                      className="cursor-pointer transition-all hover:scale-105"
                      onClick={() => toggleArrayFilter('timezones', timezone)}
                    >
                      {timezone}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Country */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Country</Label>
                <Popover open={countryDropdownOpen} onOpenChange={setCountryDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {localFilters.countries.length > 0
                        ? `${localFilters.countries.length} selected`
                        : "Select countries"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search countries..." />
                      <CommandList>
                        <CommandEmpty>No countries found</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {countries.map((country) => (
                            <CommandItem
                              key={country}
                              onSelect={() => toggleArrayFilter('countries', country)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={localFilters.countries.includes(country)}
                                className="mr-2"
                              />
                              <span>{country}</span>
                              {localFilters.countries.includes(country) && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {localFilters.countries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localFilters.countries.map((country) => (
                      <Badge key={country} variant="default">
                        {country}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => toggleArrayFilter('countries', country)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* State/Region */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">State/Region</Label>
                <Popover open={stateDropdownOpen} onOpenChange={setStateDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {localFilters.states.length > 0
                        ? `${localFilters.states.length} selected`
                        : "Select states/regions"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search states/regions..." />
                      <CommandList>
                        <CommandEmpty>No states/regions found</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {states.map((state) => (
                            <CommandItem
                              key={state}
                              onSelect={() => toggleArrayFilter('states', state)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={localFilters.states.includes(state)}
                                className="mr-2"
                              />
                              <span>{state}</span>
                              {localFilters.states.includes(state) && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {localFilters.states.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localFilters.states.map((state) => (
                      <Badge key={state} variant="default">
                        {state}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => toggleArrayFilter('states', state)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* City */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">City</Label>
                <Popover open={cityDropdownOpen} onOpenChange={setCityDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {localFilters.cities.length > 0
                        ? `${localFilters.cities.length} selected`
                        : "Select cities"}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search cities..." />
                      <CommandList>
                        <CommandEmpty>No cities found</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {cities.map((city) => (
                            <CommandItem
                              key={city}
                              onSelect={() => toggleArrayFilter('cities', city)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={localFilters.cities.includes(city)}
                                className="mr-2"
                              />
                              <span>{city}</span>
                              {localFilters.cities.includes(city) && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {localFilters.cities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localFilters.cities.map((city) => (
                      <Badge key={city} variant="default">
                        {city}
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => toggleArrayFilter('cities', city)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

