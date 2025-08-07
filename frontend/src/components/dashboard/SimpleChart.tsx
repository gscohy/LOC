import React from 'react';

interface ChartData {
  name: string;
  revenus: number;
  charges: number;
  benefice: number;
}

interface SimpleChartProps {
  data: ChartData[];
  title: string;
  type: 'bar' | 'line';
  height?: number;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, title, type, height = 300 }) => {
  const maxValue = Math.max(...data.flatMap(d => [d.revenus, Math.abs(d.charges), Math.abs(d.benefice)]));
  const minValue = Math.min(...data.flatMap(d => [d.benefice]));
  const range = maxValue - minValue;

  const getBarHeight = (value: number) => {
    return Math.max(5, Math.abs(value / maxValue) * (height - 100));
  };

  const getColor = (type: 'revenus' | 'charges' | 'benefice') => {
    switch (type) {
      case 'revenus': return '#10B981';
      case 'charges': return '#EF4444';
      case 'benefice': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (type === 'bar') {
    return (
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between space-x-2" style={{ height: height + 'px' }}>
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                <div className="flex items-end space-x-1 h-full">
                  {/* Barre Revenus */}
                  <div className="relative group">
                    <div
                      className="w-6 bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                      style={{ height: getBarHeight(item.revenus) + 'px' }}
                    />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1">
                      Revenus: {formatCurrency(item.revenus)}
                    </div>
                  </div>
                  
                  {/* Barre Charges */}
                  <div className="relative group">
                    <div
                      className="w-6 bg-red-500 rounded-t transition-all duration-300 hover:bg-red-600"
                      style={{ height: getBarHeight(Math.abs(item.charges)) + 'px' }}
                    />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1">
                      Charges: {formatCurrency(Math.abs(item.charges))}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 text-center font-medium">
                  {item.name}
                </div>
                <div className={`text-xs font-semibold ${item.benefice >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(item.benefice)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Légende */}
          <div className="flex justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Revenus</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Charges</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">Bénéfice</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Line chart version
  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <div className="p-6">
        <div className="relative" style={{ height: height + 'px' }}>
          <svg 
            width="100%" 
            height="100%" 
            className="overflow-visible"
            viewBox={`0 0 800 ${height}`}
            preserveAspectRatio="none"
          >
            {/* Grille */}
            <defs>
              <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
              </pattern>
              <linearGradient id="beneficeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={getColor('benefice')} stopOpacity="0.2"/>
                <stop offset="100%" stopColor={getColor('benefice')} stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
            
            {/* Ligne zéro */}
            <line x1="0" y1={height/2} x2="800" y2={height/2} stroke="#9ca3af" strokeWidth="2" strokeDasharray="10,5" />
            
            {data.length > 1 && (
              <>
                {/* Zone sous la courbe */}
                <path
                  fill="url(#beneficeGradient)"
                  stroke="none"
                  d={`M 0,${height/2} ${data.map((item, index) => {
                    const x = (index / (data.length - 1)) * 800;
                    const y = Math.max(10, Math.min(height - 10, height/2 - (item.benefice / (maxValue || 1)) * (height/2 - 20)));
                    return `L ${x},${y}`;
                  }).join(' ')} L 800,${height/2} Z`}
                />
                
                {/* Ligne des bénéfices */}
                <polyline
                  fill="none"
                  stroke={getColor('benefice')}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={data.map((item, index) => {
                    const x = (index / (data.length - 1)) * 800;
                    const y = Math.max(10, Math.min(height - 10, height/2 - (item.benefice / (maxValue || 1)) * (height/2 - 20)));
                    return `${x},${y}`;
                  }).join(' ')}
                />
                
                {/* Points sur la ligne - toujours visibles */}
                {data.map((item, index) => {
                  const x = (index / (data.length - 1)) * 800;
                  const y = Math.max(10, Math.min(height - 10, height/2 - (item.benefice / (maxValue || 1)) * (height/2 - 20)));
                  return (
                    <g key={index}>
                      {/* Cercle externe */}
                      <circle
                        cx={x}
                        cy={y}
                        r="6"
                        fill="white"
                        stroke={getColor('benefice')}
                        strokeWidth="2"
                        className="hover:r-8 transition-all cursor-pointer"
                      />
                      {/* Point central */}
                      <circle
                        cx={x}
                        cy={y}
                        r="2"
                        fill={getColor('benefice')}
                      />
                      <text
                        x={x}
                        y={height - 5}
                        textAnchor="middle"
                        className="text-xs fill-gray-600 font-medium"
                        fontSize="12"
                      >
                        {item.name}
                      </text>
                    </g>
                  );
                })}
              </>
            )}
          </svg>
          
          {/* Valeurs sur hover */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {data.map((item, index) => (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity bg-black text-white text-xs rounded px-2 py-1"
                style={{
                  left: `${(index / (data.length - 1)) * 100}%`,
                  top: `${height/2 - (item.benefice / maxValue) * (height/2 - 20) - 30}px`
                }}
              >
                {formatCurrency(item.benefice)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleChart;