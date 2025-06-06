import React from 'react';
import { Button } from '@/components/ui/button';
import { FilterType, ShowTypes } from '@/types';
interface UtxoFilterProps {
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  showTypes: ShowTypes;
  setShowTypes: React.Dispatch<React.SetStateAction<ShowTypes>>;
}
const UtxoFilter: React.FC<UtxoFilterProps> = ({
  filter,
  setFilter,
  showTypes,
  setShowTypes,
}) => {
  const handleShowTypeChange = (type: keyof ShowTypes) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTypes((prev: ShowTypes) => ({ ...prev, [type]: !prev[type] }));
  };
  const handleFilterClick = (newFilter: FilterType) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFilter(filter === newFilter ? 'all' : newFilter);
  };
  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      {/* Compact Asset Types and Filters */}
      <div className="space-y-2">
        {/* Asset Type Toggles */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">Show:</span>
          <Button
            variant={showTypes.inscriptions ? "default" : "outline"}
            size="sm"
            className={`h-6 px-3 text-xs transition-all duration-200 ${
              showTypes.inscriptions 
                ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                : 'hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
            onClick={handleShowTypeChange('inscriptions')}
          >
            Inscriptions
          </Button>
          <Button
            variant={showTypes.runes ? "default" : "outline"}
            size="sm"
            className={`h-6 px-3 text-xs transition-all duration-200 ${
              showTypes.runes 
                ? 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500' 
                : 'hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
            }`}
            onClick={handleShowTypeChange('runes')}
          >
            Runes
          </Button>
          <Button
            variant={showTypes.cardinals ? "default" : "outline"}
            size="sm"
            className={`h-6 px-3 text-xs transition-all duration-200 ${
              showTypes.cardinals 
                ? 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500' 
                : 'hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
            onClick={handleShowTypeChange('cardinals')}
          >
            Cardinals
          </Button>
        </div>

        {/* Inscription Filters - Only show when inscriptions are enabled */}
        {showTypes.inscriptions && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-2">Filter:</span>
            <Button
              variant={filter === 'all' ? "default" : "outline"}
              size="sm"
              className={`h-6 px-2 text-xs transition-all duration-200 ${
                filter === 'all' 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                  : 'hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/20'
              }`}
              onClick={handleFilterClick('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'bitmap' ? "default" : "outline"}
              size="sm"
              className={`h-6 px-3 text-xs transition-all duration-200 ${
                filter === 'bitmap' 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                  : 'hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              }`}
              onClick={handleFilterClick('bitmap')}
            >
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-current rounded-sm"></span>
                Bitmaps
              </span>
            </Button>
            <Button
              variant={filter === 'parcel' ? "default" : "outline"}
              size="sm"
              className={`h-6 px-3 text-xs transition-all duration-200 ${
                filter === 'parcel' 
                  ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' 
                  : 'hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
              }`}
              onClick={handleFilterClick('parcel')}
            >
              <span className="inline-flex items-center gap-1">
                <span className="relative w-2 h-2 border border-current rounded-sm">
                  <span className="absolute inset-0.5 bg-current rounded-sm"></span>
                </span>
                Parcels
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
export default UtxoFilter;
