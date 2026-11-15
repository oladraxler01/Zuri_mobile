import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';

/** Open the system file picker, then the upload details screen. */
export async function pickAndUploadMaterial(courseId?: string) {
  const res = await DocumentPicker.getDocumentAsync({
    type: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/*',
      'image/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return;
  const f = res.assets[0];
  router.push({
    pathname: '/material/new',
    params: {
      uri: f.uri,
      name: f.name,
      mimeType: f.mimeType ?? '',
      size: String(f.size ?? 0),
      courseId: courseId ?? '',
    },
  } as any);
}
