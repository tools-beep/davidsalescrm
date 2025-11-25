import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";

interface TaskTemplate {
  id: string;
  template_name: string;
  description: string;
  default_client?: string;
  default_task_type?: string;
  default_categories?: string[];
  default_priority?: string;
  auto_queue_enabled: boolean;
}

interface TemplateCardProps {
  template: TaskTemplate;
  onAddToQueue: (template: TaskTemplate) => void;
  onEdit: (template: TaskTemplate) => void;
  onDelete: (templateId: string) => void;
}

const PASTEL_COLORS = {
  // Luxury Macaroon Pastels
  cardGlass: 'rgba(255, 255, 255, 0.85)',
  mintMatcha: '#D6F7E2',
  blueberryMilk: '#BFD9FF',
  lavenderCloud: '#D8C8FF',
  peachSouffle: '#FBC7A7',
  pistachioCream: '#CFF5D6',
  honeyButter: '#FFE9B5',
  
  // Text Colors
  darkText: '#2A2A2A',
  warmText: '#6F6F6F',
  pistachioText: '#0A7A32',
  
  // Shadows
  shadowSoft: '0 4px 12px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)',
};

export function TemplateCard({ template, onAddToQueue, onEdit, onDelete }: TemplateCardProps) {
  return (
    <Card 
      className="border-0 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
      style={{
        background: PASTEL_COLORS.cardGlass,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '22px',
        boxShadow: PASTEL_COLORS.shadowSoft,
      }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 
              className="text-lg font-semibold mb-1"
              style={{ color: PASTEL_COLORS.darkText }}
            >
              {template.template_name}
            </h3>
            <p 
              className="text-sm line-clamp-2"
              style={{ color: PASTEL_COLORS.warmText }}
            >
              {template.description}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(template)}
              className="h-8 w-8 p-0 hover:bg-white/50 rounded-full"
              style={{ color: PASTEL_COLORS.blueberryMilk }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(template.id)}
              className="h-8 w-8 p-0 hover:bg-red-50 rounded-full"
              style={{ color: '#F57A7A' }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.default_client && (
            <Badge 
              className="text-xs font-medium border-0"
              style={{ 
                backgroundColor: PASTEL_COLORS.blueberryMilk,
                color: PASTEL_COLORS.darkText 
              }}
            >
              {template.default_client}
            </Badge>
          )}
          {template.default_task_type && (
            <Badge 
              className="text-xs font-medium border-0"
              style={{ 
                backgroundColor: PASTEL_COLORS.lavenderCloud,
                color: PASTEL_COLORS.darkText 
              }}
            >
              {template.default_task_type}
            </Badge>
          )}
          {template.default_priority && (
            <Badge 
              className="text-xs font-medium border-0"
              style={{ 
                backgroundColor: PASTEL_COLORS.peachSouffle,
                color: PASTEL_COLORS.darkText 
              }}
            >
              {template.default_priority}
            </Badge>
          )}
          {template.default_categories && template.default_categories.length > 0 && (
            <Badge 
              className="text-xs font-medium border-0"
              style={{ 
                backgroundColor: PASTEL_COLORS.mintMatcha,
                color: PASTEL_COLORS.darkText 
              }}
            >
              {template.default_categories.length} {template.default_categories.length === 1 ? 'category' : 'categories'}
            </Badge>
          )}
          {template.auto_queue_enabled && (
            <Badge 
              className="text-xs font-medium border-0"
              style={{ 
                backgroundColor: PASTEL_COLORS.honeyButter,
                color: PASTEL_COLORS.darkText 
              }}
            >
              ⚡ Auto-queue
            </Badge>
          )}
        </div>

        {/* Add to Queue Button */}
        <Button
          onClick={() => onAddToQueue(template)}
          className="w-full border-0 font-semibold transition-all duration-300 hover:brightness-105"
          style={{
            backgroundColor: PASTEL_COLORS.pistachioCream,
            color: PASTEL_COLORS.pistachioText,
            borderRadius: '16px',
            boxShadow: PASTEL_COLORS.shadowSoft,
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add to Queue
        </Button>
      </div>
    </Card>
  );
}

