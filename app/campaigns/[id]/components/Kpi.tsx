import { Icons } from "@/components/ui/Icons";

interface KpiProps {
  title: string;
  value: number | string;
  icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
}

export function Kpi({ title, value, icon }: KpiProps) {
  const IconComponent = icon;
  
  // Determine color scheme based on title
  const getColorScheme = (title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('lead')) {
      return { bg: 'rgba(76, 103, 255, 0.1)', color: '#4C67FF', gradient: 'linear-gradient(135deg, rgba(76, 103, 255, 0.15) 0%, rgba(76, 103, 255, 0.05) 100%)' };
    } else if (lowerTitle.includes('sent')) {
      return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)' };
    } else if (lowerTitle.includes('open')) {
      return { bg: 'rgba(169, 76, 255, 0.1)', color: '#A94CFF', gradient: 'linear-gradient(135deg, rgba(169, 76, 255, 0.15) 0%, rgba(169, 76, 255, 0.05) 100%)' };
    } else if (lowerTitle.includes('reply')) {
      return { bg: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', gradient: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 107, 107, 0.05) 100%)' };
    } else if (lowerTitle.includes('conversion')) {
      return { bg: 'rgba(78, 205, 196, 0.1)', color: '#4ecdc4', gradient: 'linear-gradient(135deg, rgba(78, 205, 196, 0.15) 0%, rgba(78, 205, 196, 0.05) 100%)' };
    } else if (lowerTitle.includes('open rate')) {
      return { bg: 'rgba(169, 76, 255, 0.1)', color: '#A94CFF', gradient: 'linear-gradient(135deg, rgba(169, 76, 255, 0.15) 0%, rgba(169, 76, 255, 0.05) 100%)' };
    } else if (lowerTitle.includes('reply rate')) {
      return { bg: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', gradient: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 107, 107, 0.05) 100%)' };
    } else if (lowerTitle.includes('conversion rate')) {
      return { bg: 'rgba(78, 205, 196, 0.1)', color: '#4ecdc4', gradient: 'linear-gradient(135deg, rgba(78, 205, 196, 0.15) 0%, rgba(78, 205, 196, 0.05) 100%)' };
    }
    return { bg: 'rgba(76, 103, 255, 0.1)', color: '#4C67FF', gradient: 'linear-gradient(135deg, rgba(76, 103, 255, 0.15) 0%, rgba(76, 103, 255, 0.05) 100%)' };
  };
  
  const colorScheme = getColorScheme(title);
  
  return (
    <div className="card-enhanced" style={{ 
      padding: 24, 
      borderRadius: 16, 
      textAlign: 'center',
      background: colorScheme.gradient,
      border: `1px solid ${colorScheme.bg.replace('0.1', '0.3')}`,
      transition: 'all 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {IconComponent && (
        <div style={{ 
          marginBottom: 12,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: colorScheme.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${colorScheme.bg.replace('0.1', '0.2')}`
          }}>
            <IconComponent size={28} style={{ color: colorScheme.color }} />
          </div>
        </div>
      )}
      <div className="text-hint" style={{ fontSize: 12, marginBottom: 8, fontWeight: 500, color: 'var(--color-text-muted)' }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: colorScheme.color }}>{value}</div>
    </div>
  );
}

