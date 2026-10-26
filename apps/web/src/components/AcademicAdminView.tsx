'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type {
  AcademicLevelDto,
  AcademicDepartmentDto,
  ProgrammeDto,
  CourseDto,
} from '@school/shared';

interface AcademicAdminViewProps {
  apiBaseUrl: string;
  tenantSlug: string;
  getHeaders: () => Record<string, string>;
  setGlobalNotice: (notice: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

export default function AcademicAdminView({
  apiBaseUrl,
  tenantSlug,
  getHeaders,
  setGlobalNotice,
}: AcademicAdminViewProps) {
  const [subTab, setSubTab] = useState<'programmes' | 'levels' | 'departments' | 'courses'>('programmes');

  // Programmes State
  const [programmes, setProgrammes] = useState<ProgrammeDto[]>([]);
  const [programmesLoading, setProgrammesLoading] = useState(false);
  const [programmesError, setProgrammesError] = useState<string | null>(null);
  const [progSearch, setProgSearch] = useState('');
  const [progStatusFilter, setProgStatusFilter] = useState<string>('ALL');
  const [progLevelFilter, setProgLevelFilter] = useState<string>('ALL');

  // Levels State
  const [levels, setLevels] = useState<AcademicLevelDto[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(false);
  const [levelsError, setLevelsError] = useState<string | null>(null);

  // Departments State
  const [departments, setDepartments] = useState<AcademicDepartmentDto[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);

  // Courses State
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Modals State
  const [isProgModalOpen, setIsProgModalOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<ProgrammeDto | null>(null);
  const [progSaving, setProgSaving] = useState(false);
  const [progModalError, setProgModalError] = useState<string | null>(null);

  // Programme Form Fields
  const [progTitle, setProgTitle] = useState('');
  const [progSlug, setProgSlug] = useState('');
  const [progLevelId, setProgLevelId] = useState('');
  const [progDeptId, setProgDeptId] = useState('');
  const [progType, setProgType] = useState('');
  const [progSummary, setProgSummary] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [progDuration, setProgDuration] = useState('');
  const [progEntryReqs, setProgEntryReqs] = useState('');
  const [progQualifications, setProgQualifications] = useState('');
  const [progCurriculum, setProgCurriculum] = useState('');
  const [progTuitionFee, setProgTuitionFee] = useState<string>('');
  const [progTuitionCurrency, setProgTuitionCurrency] = useState('USD');
  const [progTuitionPeriod, setProgTuitionPeriod] = useState('PER_YEAR');
  const [progTuitionDesc, setProgTuitionDesc] = useState('');
  const [progDisplayTuition, setProgDisplayTuition] = useState(false);
  const [progStatus, setProgStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [progIsFeatured, setProgIsFeatured] = useState(false);
  const [progSeoTitle, setProgSeoTitle] = useState('');
  const [progSeoDesc, setProgSeoDesc] = useState('');

  // Level Modal State
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AcademicLevelDto | null>(null);
  const [levelName, setLevelName] = useState('');
  const [levelSlug, setLevelSlug] = useState('');
  const [levelType, setLevelType] = useState<string>('SECONDARY');
  const [levelAgeRange, setLevelAgeRange] = useState('');
  const [levelDesc, setLevelDesc] = useState('');
  const [levelOrder, setLevelOrder] = useState<number>(0);
  const [levelSaving, setLevelSaving] = useState(false);
  const [levelModalError, setLevelModalError] = useState<string | null>(null);

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<AcademicDepartmentDto | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptSlug, setDeptSlug] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptType, setDeptType] = useState<string>('DEPARTMENT');
  const [deptParentId, setDeptParentId] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptModalError, setDeptModalError] = useState<string | null>(null);

  // Course Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDto | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSlug, setCourseSlug] = useState('');
  const [courseDeptId, setCourseDeptId] = useState('');
  const [courseCredits, setCourseCredits] = useState<string>('');
  const [courseSummary, setCourseSummary] = useState('');
  const [courseIsElective, setCourseIsElective] = useState(false);
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseModalError, setCourseModalError] = useState<string | null>(null);

  // Fetch functions
  const fetchProgrammes = useCallback(async () => {
    setProgrammesLoading(true);
    setProgrammesError(null);
    try {
      const query = new URLSearchParams();
      if (progStatusFilter !== 'ALL') query.set('status', progStatusFilter);
      if (progLevelFilter !== 'ALL') query.set('levelId', progLevelFilter);
      if (progSearch.trim()) query.set('search', progSearch.trim());

      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/programmes?${query.toString()}`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch programmes');
      setProgrammes(data.data?.items || []);
    } catch (err: any) {
      setProgrammesError(err.message || 'Error loading programmes');
    } finally {
      setProgrammesLoading(false);
    }
  }, [apiBaseUrl, getHeaders, progStatusFilter, progLevelFilter, progSearch]);

  const fetchLevels = useCallback(async () => {
    setLevelsLoading(true);
    setLevelsError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/levels`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch academic levels');
      setLevels(data.data || []);
    } catch (err: any) {
      setLevelsError(err.message || 'Error loading levels');
    } finally {
      setLevelsLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    setDepartmentsError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/departments`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch departments');
      setDepartments(data.data || []);
    } catch (err: any) {
      setDepartmentsError(err.message || 'Error loading departments');
    } finally {
      setDepartmentsLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  const fetchCourses = useCallback(async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/courses`, {
        headers: getHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch courses');
      setCourses(Array.isArray(data.data) ? data.data : data.data?.items || []);
    } catch (err: any) {
      setCoursesError(err.message || 'Error loading courses');
    } finally {
      setCoursesLoading(false);
    }
  }, [apiBaseUrl, getHeaders]);

  useEffect(() => {
    fetchLevels();
    fetchDepartments();
    fetchCourses();
    fetchProgrammes();
  }, [fetchLevels, fetchDepartments, fetchCourses, fetchProgrammes]);

  // Programme Handlers
  const handleOpenCreateProg = () => {
    setEditingProg(null);
    setProgTitle('');
    setProgSlug('');
    setProgLevelId('');
    setProgDeptId('');
    setProgType('');
    setProgSummary('');
    setProgDesc('');
    setProgDuration('');
    setProgEntryReqs('');
    setProgQualifications('');
    setProgCurriculum('');
    setProgTuitionFee('');
    setProgTuitionCurrency('USD');
    setProgTuitionPeriod('PER_YEAR');
    setProgTuitionDesc('');
    setProgDisplayTuition(false);
    setProgStatus('DRAFT');
    setProgIsFeatured(false);
    setProgSeoTitle('');
    setProgSeoDesc('');
    setProgModalError(null);
    setIsProgModalOpen(true);
  };

  const handleOpenEditProg = (prog: ProgrammeDto) => {
    setEditingProg(prog);
    setProgTitle(prog.title);
    setProgSlug(prog.slug);
    setProgLevelId(prog.level?.id || '');
    setProgDeptId(prog.department?.id || '');
    setProgType(prog.programmeType || '');
    setProgSummary(prog.summary || '');
    setProgDesc(prog.description || '');
    setProgDuration(prog.duration || '');
    setProgEntryReqs(prog.entryRequirements || '');
    setProgQualifications(prog.qualificationsAwarded || '');
    setProgCurriculum(prog.curriculum || '');
    setProgTuitionFee(prog.tuitionFee !== undefined && prog.tuitionFee !== null ? String(prog.tuitionFee) : '');
    setProgTuitionCurrency(prog.tuitionCurrency || 'USD');
    setProgTuitionPeriod(prog.tuitionPeriod || 'PER_YEAR');
    setProgTuitionDesc(prog.tuitionDescription || '');
    setProgDisplayTuition(Boolean(prog.displayTuition));
    setProgStatus(prog.status);
    setProgIsFeatured(Boolean(prog.isFeatured));
    setProgSeoTitle(prog.seoTitle || '');
    setProgSeoDesc(prog.seoDescription || '');
    setProgModalError(null);
    setIsProgModalOpen(true);
  };

  const handleSaveProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    setProgSaving(true);
    setProgModalError(null);

    const payload: Record<string, any> = {
      title: progTitle.trim(),
      slug: progSlug.trim().toLowerCase(),
      levelId: progLevelId || null,
      departmentId: progDeptId || null,
      programmeType: progType.trim() || null,
      summary: progSummary.trim() || null,
      description: progDesc.trim() || null,
      duration: progDuration.trim() || null,
      entryRequirements: progEntryReqs.trim() || null,
      qualificationsAwarded: progQualifications.trim() || null,
      curriculum: progCurriculum.trim() || null,
      tuitionFee: progTuitionFee.trim() ? parseFloat(progTuitionFee) : null,
      tuitionCurrency: progTuitionCurrency.trim() || 'USD',
      tuitionPeriod: progTuitionPeriod.trim() || null,
      tuitionDescription: progTuitionDesc.trim() || null,
      displayTuition: progDisplayTuition,
      status: progStatus,
      isFeatured: progIsFeatured,
      seoTitle: progSeoTitle.trim() || null,
      seoDescription: progSeoDesc.trim() || null,
    };

    try {
      const url = editingProg
        ? `${apiBaseUrl}/api/v1/tenant/cms/academics/programmes/${editingProg.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/academics/programmes`;
      const method = editingProg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to save programme');

      setGlobalNotice({
        type: 'success',
        message: `Programme "${payload.title}" saved successfully.`,
      });
      setIsProgModalOpen(false);
      fetchProgrammes();
    } catch (err: any) {
      setProgModalError(err.message || 'Error saving programme');
    } finally {
      setProgSaving(false);
    }
  };

  const handleToggleStatus = async (prog: ProgrammeDto) => {
    const nextStatus = prog.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/programmes/${prog.id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update programme status');

      setGlobalNotice({
        type: 'success',
        message: `Programme status changed to ${nextStatus}.`,
      });
      fetchProgrammes();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error updating status' });
    }
  };

  const handleDeleteProgramme = async (prog: ProgrammeDto) => {
    if (!window.confirm(`Are you sure you want to delete programme "${prog.title}"?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/programmes/${prog.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to delete programme');
      }

      setGlobalNotice({ type: 'success', message: `Programme "${prog.title}" deleted.` });
      fetchProgrammes();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error deleting programme' });
    }
  };

  // Level Handlers
  const handleOpenCreateLevel = () => {
    setEditingLevel(null);
    setLevelName('');
    setLevelSlug('');
    setLevelType('SECONDARY');
    setLevelAgeRange('');
    setLevelDesc('');
    setLevelOrder(levels.length);
    setLevelModalError(null);
    setIsLevelModalOpen(true);
  };

  const handleOpenEditLevel = (lvl: AcademicLevelDto) => {
    setEditingLevel(lvl);
    setLevelName(lvl.name);
    setLevelSlug(lvl.slug);
    setLevelType(lvl.levelType || 'OTHER');
    setLevelAgeRange(lvl.ageRange || '');
    setLevelDesc(lvl.description || '');
    setLevelOrder(lvl.orderIndex);
    setLevelModalError(null);
    setIsLevelModalOpen(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLevelSaving(true);
    setLevelModalError(null);

    const payload = {
      name: levelName.trim(),
      slug: levelSlug.trim().toLowerCase(),
      levelType,
      ageRange: levelAgeRange.trim() || null,
      description: levelDesc.trim() || null,
      orderIndex: Number(levelOrder) || 0,
    };

    try {
      const url = editingLevel
        ? `${apiBaseUrl}/api/v1/tenant/cms/academics/levels/${editingLevel.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/academics/levels`;
      const method = editingLevel ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to save academic level');

      setGlobalNotice({ type: 'success', message: `Level "${payload.name}" saved.` });
      setIsLevelModalOpen(false);
      fetchLevels();
    } catch (err: any) {
      setLevelModalError(err.message || 'Error saving level');
    } finally {
      setLevelSaving(false);
    }
  };

  const handleDeleteLevel = async (lvl: AcademicLevelDto) => {
    if (!window.confirm(`Delete academic level "${lvl.name}"? Program associations will be unlinked.`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/levels/${lvl.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to delete level');
      }
      setGlobalNotice({ type: 'success', message: `Level "${lvl.name}" deleted.` });
      fetchLevels();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error deleting level' });
    }
  };

  // Department Handlers
  const handleOpenCreateDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptSlug('');
    setDeptCode('');
    setDeptType('DEPARTMENT');
    setDeptParentId('');
    setDeptDesc('');
    setDeptModalError(null);
    setIsDeptModalOpen(true);
  };

  const handleOpenEditDept = (dept: AcademicDepartmentDto) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptSlug(dept.slug);
    setDeptCode(dept.code || '');
    setDeptType(dept.departmentType || 'DEPARTMENT');
    setDeptParentId(dept.parentId || '');
    setDeptDesc(dept.description || '');
    setDeptModalError(null);
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptSaving(true);
    setDeptModalError(null);

    const payload = {
      name: deptName.trim(),
      slug: deptSlug.trim().toLowerCase(),
      code: deptCode.trim() || null,
      departmentType: deptType,
      parentId: deptParentId || null,
      description: deptDesc.trim() || null,
    };

    try {
      const url = editingDept
        ? `${apiBaseUrl}/api/v1/tenant/cms/academics/departments/${editingDept.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/academics/departments`;
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to save department');

      setGlobalNotice({ type: 'success', message: `Department "${payload.name}" saved.` });
      setIsDeptModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      setDeptModalError(err.message || 'Error saving department');
    } finally {
      setDeptSaving(false);
    }
  };

  const handleDeleteDept = async (dept: AcademicDepartmentDto) => {
    if (!window.confirm(`Delete department "${dept.name}"? Sub-departments and programmes will be unlinked.`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/departments/${dept.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to delete department');
      }
      setGlobalNotice({ type: 'success', message: `Department "${dept.name}" deleted.` });
      fetchDepartments();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error deleting department' });
    }
  };

  // Course Handlers
  const handleOpenCreateCourse = () => {
    setEditingCourse(null);
    setCourseCode('');
    setCourseTitle('');
    setCourseSlug('');
    setCourseDeptId('');
    setCourseCredits('');
    setCourseSummary('');
    setCourseIsElective(false);
    setCourseModalError(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (c: CourseDto) => {
    setEditingCourse(c);
    setCourseCode(c.code || '');
    setCourseTitle(c.title);
    setCourseSlug(c.slug);
    setCourseDeptId(c.departmentId || '');
    setCourseCredits(c.credits !== null && c.credits !== undefined ? String(c.credits) : '');
    setCourseSummary(c.summary || '');
    setCourseIsElective(Boolean(c.isElective));
    setCourseModalError(null);
    setIsCourseModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseSaving(true);
    setCourseModalError(null);

    const payload = {
      code: courseCode.trim() || null,
      title: courseTitle.trim(),
      slug: courseSlug.trim().toLowerCase(),
      departmentId: courseDeptId || null,
      credits: courseCredits.trim() ? parseFloat(courseCredits) : null,
      summary: courseSummary.trim() || null,
      isElective: courseIsElective,
    };

    try {
      const url = editingCourse
        ? `${apiBaseUrl}/api/v1/tenant/cms/academics/courses/${editingCourse.id}`
        : `${apiBaseUrl}/api/v1/tenant/cms/academics/courses`;
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to save course');

      setGlobalNotice({ type: 'success', message: `Course "${payload.title}" saved.` });
      setIsCourseModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      setCourseModalError(err.message || 'Error saving course');
    } finally {
      setCourseSaving(false);
    }
  };

  const handleDeleteCourse = async (c: CourseDto) => {
    if (!window.confirm(`Delete course "${c.title}"?`)) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/tenant/cms/academics/courses/${c.id}`, {
        method: 'DELETE',
        headers: getHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || 'Failed to delete course');
      }
      setGlobalNotice({ type: 'success', message: `Course "${c.title}" deleted.` });
      fetchCourses();
    } catch (err: any) {
      setGlobalNotice({ type: 'error', message: err.message || 'Error deleting course' });
    }
  };

  return (
    <section aria-labelledby="academic-catalogue-heading" style={{ marginTop: '0.5rem' }}>
      {/* Header and Subtabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 id="academic-catalogue-heading" style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Academic Catalogue & Institutional Structure
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
            Flexible multi-tier academic structure supporting kindergarten, schools, colleges, and TVET institutes.
          </p>
        </div>

        {/* Subtab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            id="academic-subtab-programmes-btn"
            type="button"
            className={`btn btn-sm ${subTab === 'programmes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('programmes')}
          >
            Programmes ({programmes.length})
          </button>
          <button
            id="academic-subtab-levels-btn"
            type="button"
            className={`btn btn-sm ${subTab === 'levels' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('levels')}
          >
            Levels ({levels.length})
          </button>
          <button
            id="academic-subtab-departments-btn"
            type="button"
            className={`btn btn-sm ${subTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('departments')}
          >
            Departments ({departments.length})
          </button>
          <button
            id="academic-subtab-courses-btn"
            type="button"
            className={`btn btn-sm ${subTab === 'courses' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('courses')}
          >
            Courses ({courses.length})
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PROGRAMMES */}
      {subTab === 'programmes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                id="programme-search-input"
                type="text"
                placeholder="Search programmes..."
                value={progSearch}
                onChange={(e) => setProgSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchProgrammes(); }}
                className="input"
                style={{ width: '220px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              />
              <select
                id="programme-status-filter"
                value={progStatusFilter}
                onChange={(e) => setProgStatusFilter(e.target.value)}
                className="select"
                style={{ width: '130px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Status</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <select
                id="programme-level-filter"
                value={progLevelFilter}
                onChange={(e) => setProgLevelFilter(e.target.value)}
                className="select"
                style={{ width: '150px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Levels</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id="create-programme-btn"
                type="button"
                onClick={handleOpenCreateProg}
                className="btn btn-primary btn-sm"
              >
                + Create Programme
              </button>
              <button
                id="refresh-programmes-btn"
                type="button"
                onClick={fetchProgrammes}
                className="btn btn-secondary btn-sm"
                disabled={programmesLoading}
              >
                {programmesLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {programmesError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }} role="alert">
              <strong>Error:</strong> {programmesError}
            </div>
          )}

          {programmesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading academic programmes...
            </div>
          ) : programmes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>No Programmes Found</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Create your first academic programme or qualification to publish to the digital catalogue.
              </p>
              <button onClick={handleOpenCreateProg} className="btn btn-primary btn-sm">
                + Create First Programme
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Programme / Slug</th>
                    <th>Level & Department</th>
                    <th>Duration</th>
                    <th>Tuition Disclosure (FR-ACAD-002)</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {programmes.map((p) => (
                    <tr key={p.id} id={`programme-row-${p.slug}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {p.title}
                          {p.isFeatured && (
                            <span className="badge badge-info" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                              Featured
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <code>/{p.slug}</code>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          {p.level?.name ? (
                            <span className="badge badge-level" style={{ marginRight: '0.35rem' }}>{p.level.name}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Level</span>
                          )}
                          {p.department?.name && (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              &bull; {p.department.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {p.duration || 'Flexible'}
                      </td>
                      <td>
                        {p.displayTuition ? (
                          <div>
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                              Approved Public Display
                            </span>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              {p.tuitionCurrency || 'USD'} {p.tuitionFee?.toLocaleString() || '0'} {p.tuitionPeriod ? `(${p.tuitionPeriod.replace('_', ' ')})` : ''}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                              Internal Only (Not Disclosed)
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            p.status === 'PUBLISHED'
                              ? 'badge-success'
                              : p.status === 'ARCHIVED'
                              ? 'badge-secondary'
                              : 'badge-warning'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {p.status === 'PUBLISHED' && (
                            <a
                              id={`view-public-prog-${p.slug}`}
                              href={`/academics/${p.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Catalogue &rarr;
                            </a>
                          )}
                          <button
                            id={`toggle-status-prog-${p.slug}`}
                            onClick={() => handleToggleStatus(p)}
                            className={`btn btn-sm ${p.status === 'PUBLISHED' ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            {p.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            id={`edit-prog-${p.slug}`}
                            onClick={() => handleOpenEditProg(p)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-prog-${p.slug}`}
                            onClick={() => handleDeleteProgramme(p)}
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: LEVELS */}
      {subTab === 'levels' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
              Stages, divisions, or year groups suitable for early childhood through tertiary institutes.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id="create-level-btn"
                type="button"
                onClick={handleOpenCreateLevel}
                className="btn btn-primary btn-sm"
              >
                + Create Level
              </button>
              <button
                id="refresh-levels-btn"
                type="button"
                onClick={fetchLevels}
                className="btn btn-secondary btn-sm"
                disabled={levelsLoading}
              >
                {levelsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {levelsError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }} role="alert">
              <strong>Error:</strong> {levelsError}
            </div>
          )}

          {levelsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading academic levels...
            </div>
          ) : levels.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>No Academic Levels</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Configure academic levels (e.g. "Primary Stage", "IGCSE & A-Levels", "Diploma") to categorize programmes.
              </p>
              <button onClick={handleOpenCreateLevel} className="btn btn-primary btn-sm">
                + Create First Level
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Level Name / Slug</th>
                    <th>Classification Type</th>
                    <th>Age Range</th>
                    <th>Sort Order</th>
                    <th>Programmes Associated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map((lvl) => (
                    <tr key={lvl.id} id={`level-row-${lvl.slug}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{lvl.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <code>{lvl.slug}</code>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                          {lvl.levelType || 'OTHER'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {lvl.ageRange || 'All Ages'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{lvl.orderIndex}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {lvl.programmesCount ?? 0}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            id={`edit-level-${lvl.slug}`}
                            onClick={() => handleOpenEditLevel(lvl)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-level-${lvl.slug}`}
                            onClick={() => handleDeleteLevel(lvl)}
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: DEPARTMENTS */}
      {subTab === 'departments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
              Faculties, academic departments, schools, or workshop divisions. Supports nested hierarchies.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id="create-dept-btn"
                type="button"
                onClick={handleOpenCreateDept}
                className="btn btn-primary btn-sm"
              >
                + Create Department
              </button>
              <button
                id="refresh-departments-btn"
                type="button"
                onClick={fetchDepartments}
                className="btn btn-secondary btn-sm"
                disabled={departmentsLoading}
              >
                {departmentsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {departmentsError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }} role="alert">
              <strong>Error:</strong> {departmentsError}
            </div>
          )}

          {departmentsLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading departments...
            </div>
          ) : departments.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>No Departments Configured</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Define faculties or departments (e.g. "Science & Mathematics", "Automotive & Mechanical").
              </p>
              <button onClick={handleOpenCreateDept} className="btn btn-primary btn-sm">
                + Create First Department
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Department / Code</th>
                    <th>Type</th>
                    <th>Parent Entity</th>
                    <th>Programmes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} id={`dept-row-${dept.slug}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{dept.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {dept.code ? <code>[{dept.code}] </code> : null}
                          <code>{dept.slug}</code>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                          {dept.departmentType || 'DEPARTMENT'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {dept.parent?.name || 'Top-Level'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {dept.programmesCount ?? 0}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            id={`edit-dept-${dept.slug}`}
                            onClick={() => handleOpenEditDept(dept)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-dept-${dept.slug}`}
                            onClick={() => handleDeleteDept(dept)}
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: COURSES */}
      {subTab === 'courses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
              Specific curriculum subjects, modules, or workshop units.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id="create-course-btn"
                type="button"
                onClick={handleOpenCreateCourse}
                className="btn btn-primary btn-sm"
              >
                + Create Course
              </button>
              <button
                id="refresh-courses-btn"
                type="button"
                onClick={fetchCourses}
                className="btn btn-secondary btn-sm"
                disabled={coursesLoading}
              >
                {coursesLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {coursesError && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }} role="alert">
              <strong>Error:</strong> {coursesError}
            </div>
          )}

          {coursesLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f8fafc' }}>No Courses Configured</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Add courses, modules, or subjects that attach to programmes.
              </p>
              <button onClick={handleOpenCreateCourse} className="btn btn-primary btn-sm">
                + Create First Course
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Code / Course Title</th>
                    <th>Department</th>
                    <th>Credits</th>
                    <th>Classification</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} id={`course-row-${c.slug}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                          {c.code ? <strong>[{c.code}] </strong> : null}
                          {c.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <code>{c.slug}</code>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {c.department?.name || 'General'}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{c.credits ?? '—'}</td>
                      <td>
                        <span className={`badge ${c.isElective ? 'badge-info' : 'badge-level'}`} style={{ fontSize: '0.75rem' }}>
                          {c.isElective ? 'Elective' : 'Core Requirement'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            id={`edit-course-${c.slug}`}
                            onClick={() => handleOpenEditCourse(c)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Edit
                          </button>
                          <button
                            id={`delete-course-${c.slug}`}
                            onClick={() => handleDeleteCourse(c)}
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PROGRAMME MODAL */}
      {isProgModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="prog-modal-title">
          <div className="modal-content" style={{ maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 id="prog-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingProg ? `Edit Programme: ${progTitle}` : 'Create New Academic Programme'}
              </h2>
              <button
                type="button"
                onClick={() => setIsProgModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {progModalError && (
              <div className="alert alert-danger" style={{ margin: '1rem' }} role="alert">
                <strong>Error: </strong> {progModalError}
              </div>
            )}

            <form onSubmit={handleSaveProgramme} noValidate style={{ padding: '1.25rem' }}>
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="prog-title-input" className="form-label">
                    Programme Title *
                  </label>
                  <input
                    id="prog-title-input"
                    type="text"
                    value={progTitle}
                    onChange={(e) => {
                      setProgTitle(e.target.value);
                      if (!editingProg) {
                        setProgSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    className="input"
                    placeholder="e.g. Cambridge IGCSE Curriculum"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prog-slug-input" className="form-label">
                    Unique URL Slug * (lowercase, hyphens)
                  </label>
                  <input
                    id="prog-slug-input"
                    type="text"
                    value={progSlug}
                    onChange={(e) => setProgSlug(e.target.value.toLowerCase())}
                    className="input"
                    placeholder="e.g. cambridge-igcse-curriculum"
                    required
                  />
                </div>
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="prog-level-select" className="form-label">
                    Academic Level (Optional)
                  </label>
                  <select
                    id="prog-level-select"
                    value={progLevelId}
                    onChange={(e) => setProgLevelId(e.target.value)}
                    className="select"
                  >
                    <option value="">None (Flexible / Standalone)</option>
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>{lvl.name} ({lvl.levelType || 'Level'})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="prog-dept-select" className="form-label">
                    Department / Faculty (Optional)
                  </label>
                  <select
                    id="prog-dept-select"
                    value={progDeptId}
                    onChange={(e) => setProgDeptId(e.target.value)}
                    className="select"
                  >
                    <option value="">None (Institutional-Wide)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="prog-duration-input" className="form-label">
                    Programme Duration
                  </label>
                  <input
                    id="prog-duration-input"
                    type="text"
                    value={progDuration}
                    onChange={(e) => setProgDuration(e.target.value)}
                    className="input"
                    placeholder="e.g. 2 Academic Years (Grades 9-10)"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prog-quals-input" className="form-label">
                    Qualifications Awarded
                  </label>
                  <input
                    id="prog-quals-input"
                    type="text"
                    value={progQualifications}
                    onChange={(e) => setProgQualifications(e.target.value)}
                    className="input"
                    placeholder="e.g. Cambridge IGCSE Certificate"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prog-summary-input" className="form-label">
                  Public Summary * (Displayed in catalogue card)
                </label>
                <textarea
                  id="prog-summary-input"
                  value={progSummary}
                  onChange={(e) => setProgSummary(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="Concise overview of the programme..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="prog-desc-input" className="form-label">
                  Full Description & Curriculum Details
                </label>
                <textarea
                  id="prog-desc-input"
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  className="textarea"
                  rows={4}
                  placeholder="In-depth breakdown of academic pathway, laboratory workshops, practical sessions..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="prog-entry-reqs-input" className="form-label">
                  Entry Criteria & Admissions Requirements
                </label>
                <textarea
                  id="prog-entry-reqs-input"
                  value={progEntryReqs}
                  onChange={(e) => setProgEntryReqs(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="e.g. Completion of Grade 8 with minimum grade B in Mathematics and English."
                />
              </div>

              {/* TUITION DISCLOSURE SECTION (FR-ACAD-002) */}
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '0.98rem', color: 'var(--accent-primary)', margin: 0 }}>
                    Tuition & Fee Disclosure Management (FR-ACAD-002)
                  </h3>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Privacy Controlled</span>
                </div>

                <div className="grid">
                  <div className="form-group">
                    <label htmlFor="prog-tuition-fee" className="form-label">Tuition Fee Amount</label>
                    <input
                      id="prog-tuition-fee"
                      type="number"
                      min="0"
                      step="any"
                      value={progTuitionFee}
                      onChange={(e) => setProgTuitionFee(e.target.value)}
                      className="input"
                      placeholder="e.g. 12500"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prog-tuition-currency" className="form-label">Currency Code</label>
                    <input
                      id="prog-tuition-currency"
                      type="text"
                      maxLength={10}
                      value={progTuitionCurrency}
                      onChange={(e) => setProgTuitionCurrency(e.target.value.toUpperCase())}
                      className="input"
                      placeholder="USD, EUR, GBP, KES"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prog-tuition-period" className="form-label">Billing Period</label>
                    <select
                      id="prog-tuition-period"
                      value={progTuitionPeriod}
                      onChange={(e) => setProgTuitionPeriod(e.target.value)}
                      className="select"
                    >
                      <option value="PER_YEAR">Per Academic Year</option>
                      <option value="PER_TERM">Per Term</option>
                      <option value="PER_SEMESTER">Per Semester</option>
                      <option value="TOTAL_PROGRAMME">Total Programme Fee</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="prog-tuition-desc" className="form-label">Tuition Inclusions / Description</label>
                  <input
                    id="prog-tuition-desc"
                    type="text"
                    value={progTuitionDesc}
                    onChange={(e) => setProgTuitionDesc(e.target.value)}
                    className="input"
                    placeholder="e.g. Includes laboratory supplies, textbooks, and examination fees."
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px' }}>
                  <input
                    id="programme-display-tuition-check"
                    type="checkbox"
                    checked={progDisplayTuition}
                    onChange={(e) => setProgDisplayTuition(e.target.checked)}
                  />
                  <label htmlFor="programme-display-tuition-check" style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', cursor: 'pointer' }}>
                    Authorize & Approve for Public Display (BR-012: If unchecked, fees remain internal and will NOT be shown on public catalogue)
                  </label>
                </div>
              </div>

              {/* Status and Visibility */}
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="prog-status-select" className="form-label">Publication Status</label>
                  <select
                    id="prog-status-select"
                    value={progStatus}
                    onChange={(e) => setProgStatus(e.target.value as any)}
                    className="select"
                  >
                    <option value="DRAFT">DRAFT (404 Fail-Closed to Anonymous)</option>
                    <option value="PUBLISHED">PUBLISHED (Visible on Public Catalogue)</option>
                    <option value="ARCHIVED">ARCHIVED (Historical Record)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input
                    id="prog-featured-check"
                    type="checkbox"
                    checked={progIsFeatured}
                    onChange={(e) => setProgIsFeatured(e.target.checked)}
                  />
                  <label htmlFor="prog-featured-check" style={{ fontSize: '0.88rem', color: '#f8fafc', cursor: 'pointer' }}>
                    Feature prominently on catalogue overview
                  </label>
                </div>
              </div>

              {/* SEO Tags */}
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="prog-seo-title" className="form-label">SEO Page Title</label>
                  <input
                    id="prog-seo-title"
                    type="text"
                    value={progSeoTitle}
                    onChange={(e) => setProgSeoTitle(e.target.value)}
                    className="input"
                    placeholder="e.g. Cambridge IGCSE Programme | Oxford International"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="prog-seo-desc" className="form-label">SEO Meta Description</label>
                  <input
                    id="prog-seo-desc"
                    type="text"
                    value={progSeoDesc}
                    onChange={(e) => setProgSeoDesc(e.target.value)}
                    className="input"
                    placeholder="Search engine summary (max 160 characters)"
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProgModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={progSaving}
                >
                  Cancel
                </button>
                <button
                  id="save-programme-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={progSaving || !progTitle.trim() || !progSlug.trim()}
                >
                  {progSaving ? 'Saving...' : editingProg ? 'Update Programme' : 'Create Programme'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEVEL MODAL */}
      {isLevelModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="level-modal-title">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 id="level-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingLevel ? `Edit Academic Level: ${levelName}` : 'Create Academic Level'}
              </h2>
              <button
                type="button"
                onClick={() => setIsLevelModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {levelModalError && (
              <div className="alert alert-danger" style={{ margin: '1rem' }} role="alert">
                <strong>Error: </strong> {levelModalError}
              </div>
            )}

            <form onSubmit={handleSaveLevel} noValidate style={{ padding: '1.25rem' }}>
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="level-name-input" className="form-label">Level Name *</label>
                  <input
                    id="level-name-input"
                    type="text"
                    value={levelName}
                    onChange={(e) => {
                      setLevelName(e.target.value);
                      if (!editingLevel) {
                        setLevelSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    className="input"
                    placeholder="e.g. Senior Secondary"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="level-slug-input" className="form-label">Slug *</label>
                  <input
                    id="level-slug-input"
                    type="text"
                    value={levelSlug}
                    onChange={(e) => setLevelSlug(e.target.value.toLowerCase())}
                    className="input"
                    placeholder="e.g. senior-secondary"
                    required
                  />
                </div>
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="level-type-select" className="form-label">Classification Type</label>
                  <select
                    id="level-type-select"
                    value={levelType}
                    onChange={(e) => setLevelType(e.target.value)}
                    className="select"
                  >
                    <option value="EARLY_YEARS">Early Childhood / Kindergarten</option>
                    <option value="PRIMARY">Primary / Elementary</option>
                    <option value="SECONDARY">Secondary / High School</option>
                    <option value="HIGHER_EDUCATION">Higher Education / College</option>
                    <option value="TVET">TVET / Technical Vocational</option>
                    <option value="OTHER">Other Academic Division</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="level-age-range-input" className="form-label">Age Range</label>
                  <input
                    id="level-age-range-input"
                    type="text"
                    value={levelAgeRange}
                    onChange={(e) => setLevelAgeRange(e.target.value)}
                    className="input"
                    placeholder="e.g. 14 - 18 Years"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="level-desc-input" className="form-label">Description</label>
                <textarea
                  id="level-desc-input"
                  value={levelDesc}
                  onChange={(e) => setLevelDesc(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="Optional details about this academic stage..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="level-order-input" className="form-label">Display Order Index</label>
                <input
                  id="level-order-input"
                  type="number"
                  value={levelOrder}
                  onChange={(e) => setLevelOrder(parseInt(e.target.value) || 0)}
                  className="input"
                  style={{ width: '120px' }}
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsLevelModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={levelSaving}
                >
                  Cancel
                </button>
                <button
                  id="save-level-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={levelSaving || !levelName.trim() || !levelSlug.trim()}
                >
                  {levelSaving ? 'Saving...' : editingLevel ? 'Update Level' : 'Create Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEPARTMENT MODAL */}
      {isDeptModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dept-modal-title">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 id="dept-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingDept ? `Edit Department: ${deptName}` : 'Create Academic Department'}
              </h2>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {deptModalError && (
              <div className="alert alert-danger" style={{ margin: '1rem' }} role="alert">
                <strong>Error: </strong> {deptModalError}
              </div>
            )}

            <form onSubmit={handleSaveDepartment} noValidate style={{ padding: '1.25rem' }}>
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="dept-name-input" className="form-label">Department Name *</label>
                  <input
                    id="dept-name-input"
                    type="text"
                    value={deptName}
                    onChange={(e) => {
                      setDeptName(e.target.value);
                      if (!editingDept) {
                        setDeptSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    className="input"
                    placeholder="e.g. Science & Mathematics"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dept-slug-input" className="form-label">Slug *</label>
                  <input
                    id="dept-slug-input"
                    type="text"
                    value={deptSlug}
                    onChange={(e) => setDeptSlug(e.target.value.toLowerCase())}
                    className="input"
                    placeholder="e.g. science-and-mathematics"
                    required
                  />
                </div>
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="dept-code-input" className="form-label">Department Code</label>
                  <input
                    id="dept-code-input"
                    type="text"
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    className="input"
                    placeholder="e.g. SCI-MATH"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dept-type-select" className="form-label">Entity Type</label>
                  <select
                    id="dept-type-select"
                    value={deptType}
                    onChange={(e) => setDeptType(e.target.value)}
                    className="select"
                  >
                    <option value="FACULTY">Faculty</option>
                    <option value="DEPARTMENT">Department</option>
                    <option value="SCHOOL">School</option>
                    <option value="DIVISION">Division / Unit</option>
                    <option value="OTHER">Other Academic Unit</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dept-parent-select" className="form-label">Parent Department (Optional)</label>
                <select
                  id="dept-parent-select"
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                  className="select"
                >
                  <option value="">None (Top-Level Faculty/Department)</option>
                  {departments
                    .filter((d) => !editingDept || d.id !== editingDept.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="dept-desc-input" className="form-label">Description</label>
                <textarea
                  id="dept-desc-input"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="Overview of faculty or department mission..."
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={deptSaving}
                >
                  Cancel
                </button>
                <button
                  id="save-dept-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={deptSaving || !deptName.trim() || !deptSlug.trim()}
                >
                  {deptSaving ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COURSE MODAL */}
      {isCourseModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 id="course-modal-title" style={{ fontSize: '1.25rem', color: '#f8fafc' }}>
                {editingCourse ? `Edit Course: ${courseTitle}` : 'Create Course / Module'}
              </h2>
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="btn btn-sm btn-secondary"
                aria-label="Close dialog"
              >
                &times;
              </button>
            </div>

            {courseModalError && (
              <div className="alert alert-danger" style={{ margin: '1rem' }} role="alert">
                <strong>Error: </strong> {courseModalError}
              </div>
            )}

            <form onSubmit={handleSaveCourse} noValidate style={{ padding: '1.25rem' }}>
              <div className="grid">
                <div className="form-group">
                  <label htmlFor="course-code-input" className="form-label">Course Code</label>
                  <input
                    id="course-code-input"
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    className="input"
                    placeholder="e.g. IGCSE-BIO-0610"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="course-title-input" className="form-label">Course Title *</label>
                  <input
                    id="course-title-input"
                    type="text"
                    value={courseTitle}
                    onChange={(e) => {
                      setCourseTitle(e.target.value);
                      if (!editingCourse) {
                        setCourseSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '')
                        );
                      }
                    }}
                    className="input"
                    placeholder="e.g. Biology & Laboratory Investigation"
                    required
                  />
                </div>
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="course-slug-input" className="form-label">Slug *</label>
                  <input
                    id="course-slug-input"
                    type="text"
                    value={courseSlug}
                    onChange={(e) => setCourseSlug(e.target.value.toLowerCase())}
                    className="input"
                    placeholder="e.g. biology-and-lab"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="course-dept-select" className="form-label">Department</label>
                  <select
                    id="course-dept-select"
                    value={courseDeptId}
                    onChange={(e) => setCourseDeptId(e.target.value)}
                    className="select"
                  >
                    <option value="">None (General)</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid">
                <div className="form-group">
                  <label htmlFor="course-credits-input" className="form-label">Credits / Workshop Hours</label>
                  <input
                    id="course-credits-input"
                    type="number"
                    step="any"
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(e.target.value)}
                    className="input"
                    placeholder="e.g. 3.0 or 120"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input
                    id="course-elective-check"
                    type="checkbox"
                    checked={courseIsElective}
                    onChange={(e) => setCourseIsElective(e.target.checked)}
                  />
                  <label htmlFor="course-elective-check" style={{ fontSize: '0.88rem', color: '#f8fafc', cursor: 'pointer' }}>
                    Elective course (Non-compulsory)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="course-summary-input" className="form-label">Course Summary</label>
                <textarea
                  id="course-summary-input"
                  value={courseSummary}
                  onChange={(e) => setCourseSummary(e.target.value)}
                  className="textarea"
                  rows={2}
                  placeholder="Concise overview of syllabus and competencies..."
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={courseSaving}
                >
                  Cancel
                </button>
                <button
                  id="save-course-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={courseSaving || !courseTitle.trim() || !courseSlug.trim()}
                >
                  {courseSaving ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
