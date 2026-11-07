import 'package:flutter_test/flutter_test.dart';
import 'package:ruo_mobile/core/api.dart';
import 'package:ruo_mobile/features/cad_blueprint.dart';
import 'package:ruo_mobile/features/rooms.dart';

void main() {
  Map<String, dynamic> valid() => {
        'code': 'P101',
        'name': 'Phòng thực hành',
        'capacity': '45',
        'room_type': 'lab',
        'description': '',
      };

  test(
    'accepts every assigned A1 room range and normalized lowercase input',
    () {
      for (var floor = 1; floor <= 5; floor++) {
        for (var number = 1; number <= 8; number++) {
          final draft = valid()
            ..['code'] = ' p${floor}0$number '
            ..['floor'] = floor;
          expect(validateRoomDraft(draft), isEmpty);
        }
      }
    },
  );

  test(
    'rejects nonexistent room indices, mismatched floors and noninteger capacity',
    () {
      for (final code in ['P109', 'P601', 'A1-101', '']) {
        expect(validateRoomDraft(valid()..['code'] = code), contains('code'));
      }
      expect(validateRoomDraft(valid()..['floor'] = 2), contains('floor'));
      for (final capacity in ['0', '501', '2.5', '-1', '', 'abc']) {
        expect(
          validateRoomDraft(valid()..['capacity'] = capacity),
          contains('capacity'),
        );
      }
    },
  );

  test('enforces meaningful names, known types and description limit', () {
    expect(validateRoomDraft(valid()..['name'] = '   '), contains('name'));
    expect(validateRoomDraft(valid()..['name'] = 'a' * 121), contains('name'));
    expect(
      validateRoomDraft(valid()..['room_type'] = 'hall'),
      contains('room_type'),
    );
    expect(
      validateRoomDraft(valid()..['description'] = 'a' * 501),
      contains('description'),
    );
  });

  test(
    'edit accepts legacy room identity while validating editable fields',
    () {
      expect(
        validateRoomDraft(valid()..['code'] = 'A1-101', creating: false),
        isEmpty,
      );
      expect(
        validateRoomDraft(valid()..['capacity'] = 501, creating: false),
        contains('capacity'),
      );
    },
  );

  test('CAD blueprint binds both A1-xxx and equivalent Pxxx notations', () {
    expect(equivalentRoomCode('p202'), 'A1-202');
    expect(equivalentRoomCode('A1-202'), 'P202');
    expect(equivalentRoomCode('A1-PH-TB'), 'A1-PH-TB');

    final index = buildCadPodIndex([
      {'code': 'P101', 'equipmentCount': 4},
      {'code': 'P203', 'equipmentCount': 2},
      {'code': 'A1-319', 'equipmentCount': 6},
    ]);
    expect(
      lookupCadPod(index, 'A1-PH-TB', floor: 1, slot: 1)?['code'],
      'P101',
    );
    expect(lookupCadPod(index, 'A1-203')?['code'], 'P203');
    expect(lookupCadPod(index, 'A1-319')?['equipmentCount'], 6);
  });

  test('extractEquipmentBlockers unpacks 409 HAS_EQUIPMENT payload safely', () {
    const err = ApiException(409, 'Phòng còn thiết bị', {
      'code': 'HAS_EQUIPMENT',
      'equipments': [
        {'code': 'PRM-001', 'name': 'Máy chiếu', 'status': 'in_use'},
      ],
    });
    final blockers = extractEquipmentBlockers(err);
    expect(blockers, hasLength(1));
    expect(blockers.first['code'], 'PRM-001');
    expect(extractEquipmentBlockers(Exception('other')), isEmpty);
  });
}
