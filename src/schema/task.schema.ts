import { z } from 'zod';

export const taskSchema = z.object({
  title: z
    .string({ required_error: 'Tiêu đề công việc không được để trống' })
    .min(3, 'Tiêu đề công việc phải có ít nhất 3 ký tự')
    .max(150, 'Tiêu đề không được vượt quá 150 ký tự'),
  description: z
    .string()
    .max(500, 'Mô tả không quá 500 ký tự')
    .optional()
    .default(''),
  projectId: z
    .string({ required_error: 'Vui lòng chọn dự án' })
    .min(1, 'Vui lòng chọn dự án'),
  assigneeId: z.string().default(''),
  followerIds: z.array(z.string()).default([]),
  dependencyIds: z.array(z.string()).default([]),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
    required_error: 'Vui lòng chọn mức độ ưu tiên',
  }),
  startDate: z
    .string({ required_error: 'Ngày bắt đầu không được để trống' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày bắt đầu phải là YYYY-MM-DD'),
  dueDate: z
    .string({ required_error: 'Hạn chót không được để trống' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng hạn chót phải là YYYY-MM-DD'),
}).refine((data) => data.startDate <= data.dueDate, {
  message: 'Ngày bắt đầu không được sau hạn chót',
  path: ['startDate'],
});

export type TaskFormData = z.infer<typeof taskSchema>;
