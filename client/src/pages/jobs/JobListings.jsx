import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs, fetchSavedJobIds, setFilters, setPage } from '../../features/jobs/jobsSlice.js';
import useDebounce from '../../hooks/useDebounce.js';
import JobCard from './components/JobCard.jsx';
import JobFilters from './components/JobFilters.jsx';
import { SkeletonCard } from '../../components/common/Loader.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
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
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink">Find Jobs</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Browse opportunities aggregated from 15+ portals.
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-elevated border border-line rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row gap-2">
        {/* Keyword */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Job title, skill, or keyword…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-line bg-elevated-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted/60 hover:text-ink-muted"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Location */}
        <div className="relative sm:w-44">
          <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line bg-elevated-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
          />
        </div>

        {/* Filter toggle */}
        <Button
          variant={hasActiveFilters ? 'primary' : 'secondary'}
          size="md"
          onClick={() => setFiltersOpen(true)}
          className="gap-1.5 shrink-0"
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-white/30 dark:bg-black/20 text-[10px] font-bold flex items-center justify-center">
              !
            </span>
          )}
        </Button>
      </div>

      <Modal isOpen={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters" size="sm">
        <JobFilters onClose={() => setFiltersOpen(false)} />
      </Modal>

      {/* Results */}
      <div className="min-w-0">
        {/* Loading skeletons */}
        {listStatus === 'loading' && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {listStatus === 'failed' && (
          <div className="text-center py-16 bg-elevated rounded-2xl border border-line">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mx-auto mb-3">
              <X size={20} className="text-rose-500" />
            </div>
            <p className="font-medium text-ink">Failed to load jobs</p>
            <p className="text-sm text-ink-muted mt-1">{error || 'Something went wrong'}</p>
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
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center bg-elevated rounded-2xl border border-line">
            <div className="w-14 h-14 rounded-2xl bg-elevated-2 flex items-center justify-center mb-4">
              <Briefcase size={24} className="text-ink-muted/50" />
            </div>
            <p className="font-semibold text-ink">No jobs found</p>
            <p className="text-sm text-ink-muted mt-1 max-w-xs px-4">
              Try different keywords, or check back after the scrapers have run.
            </p>
          </div>
        )}

        {listStatus === 'succeeded' && listings.length > 0 && (
          <>
            <p className="text-xs text-ink-muted mb-3">
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
                  <ChevronLeft size={14} /> <span className="hidden sm:inline">Prev</span>
                </Button>

                <span className="px-3 py-1.5 text-xs font-medium text-ink-muted bg-elevated rounded-lg border border-line">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => dispatch(setPage(pagination.page + 1))}
                >
                  <span className="hidden sm:inline">Next</span> <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobListings;
