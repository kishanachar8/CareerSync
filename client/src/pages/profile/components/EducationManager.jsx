import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import {
  addEducation,
  updateEducation,
  deleteEducation,
  resetSaveStatus,
} from '../../../features/profile/profileSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import FormField from '../../../components/forms/FormField.jsx';
import { Pencil, Trash2, Plus, GraduationCap } from 'lucide-react';
import { formatDate } from '../../../utils/formatDate.js';

const EducationForm = ({ defaultValues, onSubmit, onCancel, isLoading }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: defaultValues || { current: false } });

  const isCurrent = watch('current');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Institution"
        placeholder="University of Delhi"
        error={errors.institution}
        {...register('institution', { required: 'Institution is required' })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Degree"
          placeholder="Bachelor of Technology"
          error={errors.degree}
          {...register('degree', { required: 'Degree is required' })}
        />
        <FormField
          label="Field of study"
          placeholder="Computer Science"
          error={errors.field}
          {...register('field')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Start year"
          type="date"
          error={errors.from}
          {...register('from', { required: 'Start date is required' })}
        />
        <FormField
          label="End year"
          type="date"
          disabled={isCurrent}
          error={errors.to}
          {...register('to')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 cursor-pointer select-none self-end pb-2">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            {...register('current')}
          />
          <span className="text-sm text-gray-700">Currently enrolled</span>
        </label>

        <FormField
          label="Grade / CGPA"
          placeholder="8.5 CGPA / First Class"
          error={errors.grade}
          {...register('grade')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Relevant coursework, achievements, activities…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          {...register('description', { maxLength: { value: 500, message: 'Max 500 characters' } })}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {defaultValues ? 'Save changes' : 'Add education'}
        </Button>
      </div>
    </form>
  );
};

const EducationCard = ({ edu, onEdit, onDelete }) => (
  <div className="flex gap-4 py-4 first:pt-0 last:pb-0 border-b border-gray-100 last:border-0">
    <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
      <GraduationCap size={18} className="text-violet-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">
        {edu.degree}{edu.field ? ` · ${edu.field}` : ''}
      </p>
      <p className="text-sm text-gray-600">{edu.institution}</p>
      <p className="text-xs text-gray-400 mt-0.5">
        {formatDate(edu.from, { year: 'numeric', month: 'short' })}
        {' — '}
        {edu.current ? 'Present' : edu.to ? formatDate(edu.to, { year: 'numeric', month: 'short' }) : ''}
        {edu.grade && <span className="ml-2 text-gray-500">· {edu.grade}</span>}
      </p>
      {edu.description && (
        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{edu.description}</p>
      )}
    </div>
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(edu)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
        aria-label="Edit"
      >
        <Pencil size={15} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(edu._id)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        aria-label="Delete"
      >
        <Trash2 size={15} />
      </button>
    </div>
  </div>
);

const EducationManager = () => {
  const dispatch = useDispatch();
  const { data: profile, saveStatus, saveError } = useSelector((s) => s.profile);
  const [modal, setModal] = useState({ open: false, editing: null });

  useEffect(() => {
    if (saveStatus === 'succeeded' && modal.open) {
      dispatch(showToast({
        message: modal.editing ? 'Education updated' : 'Education added',
        type: 'success',
      }));
      dispatch(resetSaveStatus());
      setModal({ open: false, editing: null });
    }
  }, [saveStatus, modal.editing, modal.open, dispatch]);

  const handleSubmit = (formData) => {
    if (modal.editing) {
      dispatch(updateEducation({ eduId: modal.editing._id, eduData: formData }));
    } else {
      dispatch(addEducation(formData));
    }
  };

  const handleDelete = (eduId) => {
    if (window.confirm('Remove this education entry?')) {
      dispatch(deleteEducation(eduId)).then((res) => {
        if (deleteEducation.fulfilled.match(res)) {
          dispatch(showToast({ message: 'Education removed', type: 'success' }));
        }
      });
    }
  };

  const isSaving = saveStatus === 'loading';
  const education = profile?.education || [];

  return (
    <>
      <Card>
        <Card.Header className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Education</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Add your academic background — degrees, certifications, courses.
            </p>
          </div>
          <Button size="sm" onClick={() => setModal({ open: true, editing: null })}>
            <Plus size={15} />
            Add
          </Button>
        </Card.Header>

        <Card.Body>
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {saveError}
            </div>
          )}

          {education.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {education.map((edu) => (
                <EducationCard
                  key={edu._id}
                  edu={edu}
                  onEdit={(e) => setModal({ open: true, editing: e })}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <GraduationCap size={36} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No education added yet</p>
              <button
                type="button"
                onClick={() => setModal({ open: true, editing: null })}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add your first degree
              </button>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit Education' : 'Add Education'}
        size="md"
      >
        <EducationForm
          defaultValues={modal.editing}
          onSubmit={handleSubmit}
          onCancel={() => setModal({ open: false, editing: null })}
          isLoading={isSaving}
        />
      </Modal>
    </>
  );
};

export default EducationManager;
