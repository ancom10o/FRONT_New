import { z } from 'zod';

const projectDate = (label: string) => z
  .string({ required_error: `Vui lòng chọn ${label.toLowerCase()}` })
  .regex(/^\d{4}-\d{2}-\d{2}$/, `Định dạng ${label.toLowerCase()} không hợp lệ (YYYY-MM-DD)`)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }, `${label} không tồn tại trong lịch`);

export const projectSchema = z
  .object({
    name: z
      .string({ required_error: 'Tên dự án không được để trống' })
      .trim()
      .min(3, 'Tên dự án phải có ít nhất 3 ký tự')
      .max(100, 'Tên dự án không quá 100 ký tự'),
    description: z
      .string()
      .max(300, 'Mô tả không được vượt quá 300 ký tự')
      .optional()
      .default(''),
    leaderId: z
      .string({ required_error: 'Vui lòng chọn Project Leader' })
      .min(1, 'Vui lòng chọn Project Leader'),
    startDate: projectDate('Ngày bắt đầu'),
    endDate: projectDate('Ngày kết thúc'),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate).getTime();
      const end = new Date(data.endDate).getTime();
      return end >= start;
    },
    {
      message: 'Ngày kết thúc phải diễn ra sau hoặc cùng ngày bắt đầu',
      path: ['endDate'],
    }
  );

export type ProjectFormData = z.infer<typeof projectSchema>;
