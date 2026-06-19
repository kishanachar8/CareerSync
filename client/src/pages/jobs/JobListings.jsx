import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs, fetchSavedJobIds, setFilters, setPage } from '../../features/jobs/jobsSlice.js';
import useDebounce from '../../hooks/useDebounce.js';
import JobCard from './components/JobCard.jsx';
import JobFilters from './components/JobFilters.jsx';
import Loader, { SkeletonCard } from '../../components/common/Loader.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  Search, MapPin, SlidersHorizontal, Briefcase,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';

const JobListings = () => {
  const dispatch = useDispatch();
  const { listings, listStatus, filters, pagination, error } = useSelector((s) => s.jobs);

  const [search,       setSearch]       = useState(filters.keyword  || '');
  const [location,     setLocation]     = useState(filters.location || '');
  const [filtersOpen,  setFiltersOpen]  = useState(false);

  const debouncedSearch   = useDebounce(search,   500);
  const debouncedLocation = useDebounce(location, 500);

  useEffect(() => {
    dispatch(fetchSavedJobIds());
  }, [dispatch]);

  const { keyword, location: filterLocation, employmentType, source, sort } = filters;
  const { page, limit } = pagination;

  useEffect(() => {
    dispatch(fetchJobs({ keyword, location: filterLocation, employmentType, source, sort, page, limit }));
  }, [dispatch, keyword, filterLocation, employmentType, source, sort, page, limit]);

  useEffect(() => {
    dispatch(setFilters({ keyword: debouncedSearch, location: debouncedLocation }));
  }, [dispatch, debouncedSearch, debouncedLocation]);

  const hasActiveFilters = !!employmentType;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Jobs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Browse opportunities aggregated from 15+ portals.
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-white border border-surface-200 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-2">
        {/* Keyword */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Job title, skill, or keyword…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Location */}
        <div className="relative sm:w-44">
          <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={hasActiveFilters ? 'primary' : 'secondary'}
          size="md"
          onClick={() => setFiltersOpen((v) => !v)}
          className="gap-1.5 shrink-0"
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-white/30 text-[10px] font-bold flex items-center justify-center">
              !
            </span>
          )}
        </Button>
      </div>

      <div className="flex gap-5">
        {/* Filter sidebar */}
        {filtersOpen && (
          <aside className="w-60 shrink-0 animate-slide-in-left">
            <div className="bg-white border border-surface-200 rounded-2xl p-4 sticky top-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm text-gray-800">Filters</p>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-surface-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <JobFilters onClose={() => setFiltersOpen(false)} />
            </div>
          </aside>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Loading skeletons */}
          {listStatus === 'loading' && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {listStatus === 'failed' && (
            <div className="text-center py-16 bg-white rounded-2xl border border-surface-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-3">
                <X size={20} className="text-rose-500" />
              </div>
              <p className="font-medium text-gray-700">Failed to load jobs</p>
              <p className="text-sm text-gray-400 mt-1">{error || 'Something went wrong'}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => dispatch(fetchJobs({ ...filters, page: pagination.page }))}
              >
                Try again
              </Button>
            </div>
          )}

          {listStatus === 'succeeded' && listings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-surface-200">
              <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
                <Briefcase size={24} className="text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">No jobs found</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                Try different keywords, or check back after the scrapers have run.
              </p>
            </div>
          )}

          {listStatus === 'succeeded' && listings.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-3">
                {pagination.total.toLocaleString()} jobs found
              </p>

              <div className="space-y-2.5">
                {listings.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => dispatch(setPage(pagination.page - 1))}
                  >
                    <ChevronLeft size={14} /> Prev
                  </Button>

                  <span className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-white rounded-lg border border-surface-200">
                    {pagination.page} / {pagination.totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => dispatch(setPage(pagination.page + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobListings;
