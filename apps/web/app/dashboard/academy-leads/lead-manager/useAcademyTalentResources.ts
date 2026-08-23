import React from 'react';
import type { AcademyCourse, AcademyTalentInstructor, UpsertAcademyCourseRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import type { AcademyTalentCourseConfigurationInput } from '../components/academy-talent-workshop.types';

export function useAcademyTalentResources(enabled: boolean) {
  const [courses, setCourses] = React.useState<AcademyCourse[]>([]);
  const [talentInstructors, setTalentInstructors] = React.useState<AcademyTalentInstructor[]>([]);

  React.useEffect(() => {
    if (!enabled) return;
    void Promise.all([apiClient.academySales.listCourses(), apiClient.academySales.listTalentInstructors()])
      .then(([nextCourses, instructorResponse]) => {
        setCourses(nextCourses);
        setTalentInstructors(instructorResponse.data);
      })
      .catch(() => {
        setCourses([]);
        setTalentInstructors([]);
      });
  }, [enabled]);

  const saveTalentCourseConfiguration = React.useCallback(async (input: AcademyTalentCourseConfigurationInput[]) => {
    await Promise.all(
      input.map(({ id, values }) =>
        id
          ? apiClient.academySales.updateCourse(id, values as UpsertAcademyCourseRequest)
          : apiClient.academySales.createCourse(values as UpsertAcademyCourseRequest)
      )
    );
    const nextCourses = await apiClient.academySales.listCourses();
    setCourses(nextCourses);
    return nextCourses;
  }, []);

  return { courses, talentInstructors, saveTalentCourseConfiguration };
}
